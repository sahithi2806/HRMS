using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Dapper;
using HrmsApi.Data;
using HrmsApi.Helpers;
using HrmsApi.Middleware;
using HrmsApi.Repositories;
using HrmsApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// 1. Add Controllers
builder.Services.AddControllers();

// 2. Register Database Connection Factory (Dapper ONLY)
var dbProvider = builder.Configuration["DatabaseProvider"] ?? "Sqlite";
if (dbProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddSingleton<IDbConnectionFactory, SqliteConnectionFactory>();
}
else
{
    builder.Services.AddSingleton<IDbConnectionFactory, SqlConnectionFactory>();
}

// 3. Register Helpers
builder.Services.AddSingleton<JwtHelper>();

// 4. Register Repositories
builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
builder.Services.AddScoped<IDocumentRepository, DocumentRepository>();
builder.Services.AddScoped<ILeaveRepository, LeaveRepository>();
builder.Services.AddScoped<IAttendanceRepository, AttendanceRepository>();
builder.Services.AddScoped<IAttendanceRegularizationRepository, AttendanceRegularizationRepository>();
builder.Services.AddScoped<IPortalRepository, PortalRepository>();
builder.Services.AddScoped<IAssetRepository, AssetRepository>();

// 5. Register Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<ILeaveService, LeaveService>();
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddScoped<IAttendanceRegularizationService, AttendanceRegularizationService>();
builder.Services.AddScoped<IPortalService, PortalService>();
builder.Services.AddScoped<IAssetService, AssetService>();

// 6. Fail-fast JWT Secret Key Validation & Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["Key"];
if (string.IsNullOrWhiteSpace(secretKey) || secretKey.Contains("PLACEHOLDER") || secretKey.Length < 32)
{
    throw new InvalidOperationException(
        "CRITICAL STARTUP ERROR: JWT secret key is missing, left as placeholder, or shorter than 32 characters. " +
        "Please provide a secure key via environment variable 'Jwt__Key' or user-secrets ('dotnet user-secrets set \"Jwt:Key\" \"<key>\"').");
}

var keyBytes = Encoding.UTF8.GetBytes(secretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"] ?? "HrmsApi",
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"] ?? "HrmsClient",
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var dbConnectionFactory = context.HttpContext.RequestServices.GetRequiredService<IDbConnectionFactory>();
            var userIdStr = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdStr, out var userId))
            {
                context.Fail("Invalid token identity claims.");
                return;
            }

            // Lightweight check: reject requests from deactivated employees on every request
            using var connection = dbConnectionFactory.CreateConnection();
            const string checkSql = "SELECT Status FROM Employees WHERE UserID = @UserID;";
            var status = await connection.QueryFirstOrDefaultAsync<string?>(checkSql, new { UserID = userId });
            if (status != null && !status.Equals("Active", StringComparison.OrdinalIgnoreCase))
            {
                context.Fail("User account or employee record is deactivated.");
            }
        }
    };
});

builder.Services.AddAuthorization();

// 7. Configure Login Rate Limiting (5/min/IP)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("LoginRateLimit", httpContext =>
    {
        var remoteIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown_ip";
        return RateLimitPartition.GetFixedWindowLimiter(remoteIp, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });
});

// 8. Swagger with Bearer Auth in Development
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "HrmsApi", Version = "v1" });
        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT"
        });
        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });
    });
}

// 9. Configure CORS from config
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://localhost:5000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// 10. Auto-initialize database schema and seed data
var dbFactory = app.Services.GetRequiredService<IDbConnectionFactory>();
DatabaseInitializer.Initialize(dbFactory);

// 11. Security Middleware & Pipeline Configuration
app.UseMiddleware<ExceptionMiddleware>();

// Security Headers (nosniff, DENY, etc.)
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

// HTTPS redirect outside Development
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
    app.UseHsts();
}

// Swagger in Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "HrmsApi v1");
    });
}

app.UseCors("AllowFrontend");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

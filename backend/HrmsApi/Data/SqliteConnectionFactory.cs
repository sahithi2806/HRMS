using System.Data;
using Microsoft.Data.Sqlite;

namespace HrmsApi.Data;

public class SqliteConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public SqliteConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("SqliteConnection") 
            ?? "Data Source=hrms.db";
    }

    public string Provider => "Sqlite";

    public IDbConnection CreateConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();

        // Register custom GETDATE() function matching SQL Server
        connection.CreateFunction("GETDATE", () => DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss"));

        // Register custom DATEDIFF function matching SQL Server DATEDIFF(day, start, end)
        connection.CreateFunction("DATEDIFF", (string unit, object? startObj, object? endObj) =>
        {
            if (startObj != null && endObj != null &&
                DateTime.TryParse(startObj.ToString(), out var start) && 
                DateTime.TryParse(endObj.ToString(), out var end))
            {
                return (int)(end.Date - start.Date).TotalDays;
            }
            return 0;
        });

        return connection;
    }
}

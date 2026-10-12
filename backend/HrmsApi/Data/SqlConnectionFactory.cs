using System.Data;
using Microsoft.Data.SqlClient;

namespace HrmsApi.Data;

public class SqlConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public SqlConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");
    }

    public string Provider => "SqlServer";

    public IDbConnection CreateConnection()
    {
        return new SqlConnection(_connectionString);
    }
}

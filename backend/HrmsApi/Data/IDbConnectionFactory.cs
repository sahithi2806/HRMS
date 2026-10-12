using System.Data;

namespace HrmsApi.Data;

public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();
    string Provider { get; }
}

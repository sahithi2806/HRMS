using HrmsApi.Helpers;
using Xunit;

namespace HrmsApi.Tests;

public class PasswordHasherTests
{
    [Fact]
    public void HashPassword_ShouldReturnValidBCryptHash()
    {
        // Arrange
        var password = "SecurePassword123!";

        // Act
        var hash = PasswordHasher.HashPassword(password);

        // Assert
        Assert.NotNull(hash);
        Assert.StartsWith("$2", hash); // Standard BCrypt prefix
        Assert.True(hash.Length > 20);
    }

    [Fact]
    public void VerifyPassword_WithCorrectPassword_ShouldReturnTrue()
    {
        // Arrange
        var password = "AdminPassword2026!";
        var hash = PasswordHasher.HashPassword(password);

        // Act
        var result = PasswordHasher.VerifyPassword(password, hash);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void TestSeedHashes_MatchKnownCredentials()
    {
        const string adminHash = "$2a$11$/N1c9972tXpqxLh74x5kEe7bWJndRfxfrOdIlBu9hhqay2egmt/bO";
        const string managerHash = "$2a$11$JKcdrN9QmoUVCDYlHMBGKOhOwrs8pwyHeaxnSFFkXDk5O3vnMbZ2C";
        const string employeeHash = "$2a$11$LF3glo5/GAPSDmwh4F79g.YAlWLNfVPSQjPQTozbIMlOwmsTZakNK";

        Assert.True(PasswordHasher.VerifyPassword("Admin@123", adminHash));
        Assert.True(PasswordHasher.VerifyPassword("Manager@123", managerHash));
        Assert.True(PasswordHasher.VerifyPassword("Employee@123", employeeHash));
    }

    [Fact]
    public void VerifyPassword_WithIncorrectPassword_ShouldReturnFalse()
    {
        // Arrange
        var password = "CorrectPassword";
        var wrongPassword = "WrongPassword";
        var hash = PasswordHasher.HashPassword(password);

        // Act
        var result = PasswordHasher.VerifyPassword(wrongPassword, hash);

        // Assert
        Assert.False(result);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-bcrypt-hash")]
    [InlineData(null)]
    public void VerifyPassword_WithMalformedHash_ShouldReturnFalseWithoutThrowing(string? malformedHash)
    {
        // Act
        var result = PasswordHasher.VerifyPassword("AnyPassword", malformedHash!);

        // Assert
        Assert.False(result);
    }
}

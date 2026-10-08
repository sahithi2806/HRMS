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

using System.Globalization;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<InventoryService>();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();

var sales = SeedData.Sales;

app.MapGet("/api/commissions", () =>
{
    var result = sales
        .GroupBy(sale => sale.Seller)
        .Select(group => new CommissionSummary(
            group.Key,
            group.Count(),
            group.Sum(sale => sale.Value),
            group.Sum(sale => CommissionCalculator.For(sale.Value))))
        .OrderBy(item => item.Seller);
    return Results.Ok(result);
});

app.MapGet("/api/inventory", (InventoryService inventory) => Results.Ok(inventory.Products));

app.MapPost("/api/inventory/movements", (InventoryMovementRequest request, InventoryService inventory) =>
{
    if (request.Quantity <= 0 || string.IsNullOrWhiteSpace(request.Description))
        return Results.BadRequest(new { message = "Quantidade e descrição são obrigatórias." });

    var outcome = inventory.Register(request);
    return outcome.IsSuccess
        ? Results.Created($"/api/inventory/movements/{outcome.Movement!.Id}", outcome.Movement)
        : Results.BadRequest(new { message = outcome.Error });
});

app.MapPost("/api/interest/calculate", (InterestRequest request) =>
{
    if (request.Amount <= 0) return Results.BadRequest(new { message = "O valor deve ser maior que zero." });
    var today = DateOnly.FromDateTime(DateTime.Today);
    var daysLate = Math.Max(0, today.DayNumber - request.DueDate.DayNumber);
    var interest = decimal.Round(request.Amount * 0.025m * daysLate, 2, MidpointRounding.AwayFromZero);
    return Results.Ok(new InterestResult(request.Amount, request.DueDate, today, daysLate, interest, request.Amount + interest));
});

app.Run();

public record Sale(string Seller, decimal Value);
public record CommissionSummary(string Seller, int SalesCount, decimal SalesTotal, decimal CommissionTotal);
public record Product(int ProductCode, string Description, int Stock);
public record InventoryMovementRequest(int ProductCode, MovementType Type, int Quantity, string Description);
public record InventoryMovement(Guid Id, int ProductCode, string ProductDescription, MovementType Type, int Quantity, string Description, int FinalStock, DateTimeOffset CreatedAt);
public record InterestRequest(decimal Amount, DateOnly DueDate);
public record InterestResult(decimal OriginalAmount, DateOnly DueDate, DateOnly CalculationDate, int DaysLate, decimal InterestAmount, decimal TotalAmount);
public enum MovementType { Entry, Exit }

public static class CommissionCalculator
{
    public static decimal For(decimal value) => value switch
    {
        < 100m => 0m,
        < 500m => decimal.Round(value * .01m, 2, MidpointRounding.AwayFromZero),
        _ => decimal.Round(value * .05m, 2, MidpointRounding.AwayFromZero)
    };
}

public sealed class InventoryService
{
    private readonly Dictionary<int, Product> _products = SeedData.Products.ToDictionary(product => product.ProductCode);
    private readonly object _lock = new();
    public IReadOnlyCollection<Product> Products => _products.Values.OrderBy(product => product.ProductCode).ToArray();

    public MovementOutcome Register(InventoryMovementRequest request)
    {
        lock (_lock)
        {
            if (!_products.TryGetValue(request.ProductCode, out var product)) return MovementOutcome.Fail("Produto não encontrado.");
            if (request.Type == MovementType.Exit && request.Quantity > product.Stock) return MovementOutcome.Fail("Estoque insuficiente para esta saída.");
            var finalStock = request.Type == MovementType.Entry ? product.Stock + request.Quantity : product.Stock - request.Quantity;
            var updated = product with { Stock = finalStock };
            _products[product.ProductCode] = updated;
            return MovementOutcome.Success(new InventoryMovement(Guid.NewGuid(), product.ProductCode, product.Description, request.Type, request.Quantity, request.Description.Trim(), finalStock, DateTimeOffset.UtcNow));
        }
    }
}

public record MovementOutcome(bool IsSuccess, InventoryMovement? Movement, string? Error)
{
    public static MovementOutcome Success(InventoryMovement movement) => new(true, movement, null);
    public static MovementOutcome Fail(string error) => new(false, null, error);
}

public static class SeedData
{
    public static readonly IReadOnlyList<Sale> Sales = new[]
    {
        new Sale("João Silva", 1200.50m), new Sale("João Silva", 950.75m), new Sale("João Silva", 1800m), new Sale("João Silva", 1400.30m), new Sale("João Silva", 1100.90m), new Sale("João Silva", 1550m), new Sale("João Silva", 1700.80m), new Sale("João Silva", 250.30m), new Sale("João Silva", 480.75m), new Sale("João Silva", 320.40m),
        new Sale("Maria Souza", 2100.40m), new Sale("Maria Souza", 1350.60m), new Sale("Maria Souza", 950.20m), new Sale("Maria Souza", 1600.75m), new Sale("Maria Souza", 1750m), new Sale("Maria Souza", 1450.90m), new Sale("Maria Souza", 400.50m), new Sale("Maria Souza", 180.20m), new Sale("Maria Souza", 90.75m),
        new Sale("Carlos Oliveira", 800.50m), new Sale("Carlos Oliveira", 1200m), new Sale("Carlos Oliveira", 1950.30m), new Sale("Carlos Oliveira", 1750.80m), new Sale("Carlos Oliveira", 1300.60m), new Sale("Carlos Oliveira", 300.40m), new Sale("Carlos Oliveira", 500m), new Sale("Carlos Oliveira", 125.75m),
        new Sale("Ana Lima", 1000m), new Sale("Ana Lima", 1100.50m), new Sale("Ana Lima", 1250.75m), new Sale("Ana Lima", 1400.20m), new Sale("Ana Lima", 1550.90m), new Sale("Ana Lima", 1650m), new Sale("Ana Lima", 75.30m), new Sale("Ana Lima", 420.90m), new Sale("Ana Lima", 315.40m)
    };
    public static readonly IReadOnlyList<Product> Products = new[]
    {
        new Product(101, "Caneta Azul", 150), new Product(102, "Caderno Universitário", 75), new Product(103, "Borracha Branca", 200), new Product(104, "Lápis Preto HB", 320), new Product(105, "Marcador de Texto Amarelo", 90)
    };
}

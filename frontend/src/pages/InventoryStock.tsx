import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "../css/inventory-stock.css";

interface Warehouse {
  id: number;
  warehouseCode: string;
  warehouseName: string;
}

interface Stock {
  warehouse: Warehouse;
  quantity: number;
}

interface InventoryItem {
  id: number;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  minimumStock: number;
  isActive: boolean;
  totalStock: number;
  isLowStock: boolean;
  stocks: Stock[];
}

interface InventorySummary {
  totalItems: number;
  totalStock: number;
  lowStockItems: number;
}

interface StockRow {
  itemId: number;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  minimumStock: number;
  quantity: number;
  warehouseName: string;
  warehouseCode: string;
  isLowStock: boolean;
}

const InventoryStock = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    totalItems: 0,
    totalStock: 0,
    lowStockItems: 0,
  });

  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInventoryStock = async () => {
    try {
      setLoading(true);
      setError("");

      const [inventoryResponse, summaryResponse] = await Promise.all([
        api.get("/inventory"),
        api.get("/inventory/summary"),
      ]);

      setItems(inventoryResponse.data?.data || []);
      setSummary(
        summaryResponse.data?.data || {
          totalItems: 0,
          totalStock: 0,
          lowStockItems: 0,
        },
      );
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Gagal mengambil data inventory stock.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryStock();
  }, []);

  const stockRows = useMemo(() => {
    const rows: StockRow[] = [];

    items.forEach((item) => {
      if (item.stocks && item.stocks.length > 0) {
        item.stocks.forEach((stock) => {
          rows.push({
            itemId: item.id,
            itemCode: item.itemCode,
            itemName: item.itemName,
            category: item.category,
            unit: item.unit,
            minimumStock: item.minimumStock,
            quantity: stock.quantity,
            warehouseName:
              stock.warehouse?.warehouseName || "Gudang tidak diketahui",
            warehouseCode: stock.warehouse?.warehouseCode || "-",
            isLowStock: item.isLowStock,
          });
        });
      } else {
        rows.push({
          itemId: item.id,
          itemCode: item.itemCode,
          itemName: item.itemName,
          category: item.category,
          unit: item.unit,
          minimumStock: item.minimumStock,
          quantity: 0,
          warehouseName: "Belum ada stok",
          warehouseCode: "-",
          isLowStock: item.isLowStock,
        });
      }
    });

    return rows;
  }, [items]);

  const warehouses = useMemo(() => {
    const names = stockRows
      .map((row) => row.warehouseName)
      .filter((name) => name !== "Belum ada stok");

    return [...new Set(names)];
  }, [stockRows]);

  const filteredRows = useMemo(() => {
    return stockRows.filter((row) => {
      const keyword = search.toLowerCase();

      const matchesSearch =
        row.itemCode.toLowerCase().includes(keyword) ||
        row.itemName.toLowerCase().includes(keyword) ||
        row.category.toLowerCase().includes(keyword) ||
        row.warehouseName.toLowerCase().includes(keyword);

      const matchesWarehouse =
        warehouseFilter === "all" || row.warehouseName === warehouseFilter;

      return matchesSearch && matchesWarehouse;
    });
  }, [stockRows, search, warehouseFilter]);

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("id-ID").format(value || 0);

  return (
    <div className="inventory-stock-page">
      <div className="inventory-stock-header">
        <div>
          <h1>Inventory Stock</h1>
          <p>Monitor jumlah persediaan barang di setiap gudang.</p>
        </div>

        <button
          className="stock-refresh-btn"
          onClick={loadInventoryStock}
          disabled={loading}
        >
          ↻ Refresh Data
        </button>
      </div>

      <div className="stock-summary-grid">
        <div className="stock-summary-card">
          <div className="stock-summary-icon blue">▣</div>
          <div>
            <span>Total Item</span>
            <h2>{formatNumber(summary.totalItems)}</h2>
            <small>Item terdaftar</small>
          </div>
        </div>

        <div className="stock-summary-card">
          <div className="stock-summary-icon green">▤</div>
          <div>
            <span>Total Stok</span>
            <h2>{formatNumber(summary.totalStock)}</h2>
            <small>Akumulasi seluruh gudang</small>
          </div>
        </div>

        <div className="stock-summary-card">
          <div className="stock-summary-icon orange">!</div>
          <div>
            <span>Low Stock Items</span>
            <h2>{formatNumber(summary.lowStockItems)}</h2>
            <small>Item mencapai batas minimum</small>
          </div>
        </div>
      </div>

      <div className="stock-table-card">
        <div className="stock-table-heading">
          <div>
            <h2>Stock by Warehouse</h2>
            <p>Rincian persediaan barang berdasarkan lokasi gudang.</p>
          </div>
        </div>

        <div className="stock-toolbar">
          <div className="stock-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Cari kode, nama barang, atau gudang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
          >
            <option value="all">Semua Gudang</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse} value={warehouse}>
                {warehouse}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="stock-error">
            {error}
            <button onClick={loadInventoryStock}>Coba Lagi</button>
          </div>
        )}

        {loading ? (
          <div className="stock-empty">Memuat data inventory stock...</div>
        ) : (
          <div className="stock-table-wrapper">
            <table className="stock-table">
              <thead>
                <tr>
                  <th>ITEM CODE</th>
                  <th>ITEM NAME</th>
                  <th>CATEGORY</th>
                  <th>WAREHOUSE</th>
                  <th>QUANTITY</th>
                  <th>MIN. STOCK</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((row, index) => (
                    <tr key={`${row.itemId}-${row.warehouseName}-${index}`}>
                      <td>
                        <span className="stock-item-code">{row.itemCode}</span>
                      </td>

                      <td>
                        <strong>{row.itemName}</strong>
                      </td>

                      <td>{row.category || "-"}</td>

                      <td>
                        <div className="stock-warehouse">
                          <strong>{row.warehouseName}</strong>
                          <small>{row.warehouseCode}</small>
                        </div>
                      </td>

                      <td>
                        <strong className="stock-quantity">
                          {formatNumber(row.quantity)} {row.unit}
                        </strong>
                      </td>

                      <td>
                        {formatNumber(row.minimumStock)} {row.unit}
                      </td>

                      <td>
                        {row.isLowStock ? (
                          <span className="stock-status low">Low Stock</span>
                        ) : (
                          <span className="stock-status normal">Normal</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="stock-empty">
                      Tidak ada data stok yang ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="stock-table-footer">
          Menampilkan {filteredRows.length} baris data stok
        </div>
      </div>
    </div>
  );
};

export default InventoryStock;

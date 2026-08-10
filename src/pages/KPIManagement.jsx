import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function KPIManagement() {
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchKPIs();
  }, []);

  async function fetchKPIs() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("kpis")
      .select("*")
      .neq("status", "priority")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching KPIs:", error);
      setError("Failed to load KPIs.");
      setLoading(false);
      return;
    }

    // Put Active KPIs first, then Hidden KPIs.
    // Each group keeps the sort_order from Supabase.
    const sortedKPIs = [...(data || [])].sort((a, b) => {
      const statusOrder = {
        active: 1,
        hidden: 2,
      };

      const statusA = statusOrder[a.status] || 99;
      const statusB = statusOrder[b.status] || 99;

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      return (a.sort_order ?? 999999) - (b.sort_order ?? 999999);
    });

    setKpis(sortedKPIs);
    setLoading(false);
  }

  return (
    <div className="page-container">

      {/* Page Header */}
      <div className="page-header">
        <h1>Implementation Team KPI Guidelines</h1>
      </div>

      {/* Loading */}
      {loading && (
        <p className="status-message">
          Loading KPIs...
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      {/* KPI Table */}
      {!loading && !error && (
        <div className="kpi-table-wrapper">
          <table className="kpi-table">
            <thead>
              <tr>
                <th>KPI Name</th>
                <th>Description</th>
                <th>Target</th>
                <th>Unit</th>
                <th>Direction</th>
              </tr>
            </thead>

            <tbody>
              {kpis.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="kpi-empty"
                  >
                    No KPIs found.
                  </td>
                </tr>
              ) : (
                kpis.map((kpi) => (
                  <tr key={kpi.kpi_id}>

                    {/* KPI Name */}
                    <td className="kpi-name">
                      {kpi.name}
                    </td>

                    {/* Description */}
                    <td className="kpi-description">
                      {kpi.description || "-"}
                    </td>

                    {/* Target */}
                    <td>
                      {kpi.target_value}
                    </td>

                    {/* Unit */}
                    <td>
                      {kpi.unit || "-"}
                    </td>

                    {/* Direction */}
                    <td>
                      <span
                        className={
                          kpi.higher_is_better
                            ? "direction-badge direction-higher"
                            : "direction-badge direction-lower"
                        }
                      >
                        {kpi.higher_is_better
                          ? "Higher is better"
                          : "Lower is better"}
                      </span>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

export default KPIManagement;
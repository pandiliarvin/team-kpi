import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import KPIChart from "../components/KPIChart";

function Dashboard() {
  const { user } = useAuth();

  const [role, setRole] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);

  const [members, setMembers] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [scores, setScores] = useState([]);

  const [selectedMember, setSelectedMember] = useState("");

  // --------------------------------------------------
  // Default date range
  // Current month + previous 2 months
  // --------------------------------------------------

  const now = new Date();

  const defaultTo = {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };

  const defaultFromDate = new Date(
    now.getFullYear(),
    now.getMonth() - 2,
    1
  );

  const defaultFrom = {
    month: defaultFromDate.getMonth() + 1,
    year: defaultFromDate.getFullYear(),
  };

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Initialize
  // --------------------------------------------------

  useEffect(() => {
    if (!user) return;

    initializeDashboard();
  }, [user]);

  async function initializeDashboard() {
    setLoading(true);
    setError("");

    const member = await getCurrentMember();

    if (!member) {
      setLoading(false);
      return;
    }

    setCurrentMember(member);
    setRole(member.role);

    await fetchKPIs();

    // Super Admin
    if (member.role === "Super Admin") {
      await fetchAllMembers();
      setSelectedMember("");
    }

    // Admin
    else if (member.role === "Admin") {
      await fetchTeamMembers(member.member_id);
      setSelectedMember(member.member_id);
    }

    // Regular User
    else {
      setSelectedMember(member.member_id);
    }

    setLoading(false);
  }

  // --------------------------------------------------
  // Get logged-in user's member record
  // --------------------------------------------------

  async function getCurrentMember() {
    const { data, error } = await supabase
      .from("members")
      .select(
        "member_id, name, email, role, auth_user_id, team_lead"
      )
      .eq("auth_user_id", user.id)
      .single();

    if (error) {
      console.error(
        "Error loading current member:",
        error
      );

      setError(
        "Unable to load your member profile."
      );

      return null;
    }

    return data;
  }

  // --------------------------------------------------
  // Super Admin
  // --------------------------------------------------

  async function fetchAllMembers() {
    const { data, error } = await supabase
      .from("members")
      .select(
        "member_id, name, email, role, team_lead"
      )
      .order("name");

    if (error) {
      console.error(
        "Error loading members:",
        error
      );

      return;
    }

    setMembers(data || []);
  }

  // --------------------------------------------------
  // Admin
  // Own record + team members
  // --------------------------------------------------

  async function fetchTeamMembers(teamLeadId) {
    const { data, error } = await supabase
      .from("members")
      .select(
        "member_id, name, email, role, team_lead"
      )
      .or(
        `member_id.eq.${teamLeadId},team_lead.eq.${teamLeadId}`
      )
      .order("name");

    if (error) {
      console.error(
        "Error loading team members:",
        error
      );

      return;
    }

    setMembers(data || []);
  }

  // --------------------------------------------------
  // Load KPIs
  // --------------------------------------------------

  async function fetchKPIs() {
	  const { data, error } = await supabase
		.from("kpis")
		.select(
		  "kpi_id, name, description, unit, target_value, higher_is_better, sort_order"
		)
		.order("sort_order", {
		  ascending: true,
		  nullsFirst: false,
		})
		.order("name", {
		  ascending: true,
		});

	  if (error) {
		console.error("Error loading KPIs:", error);
		return;
	  }

	  setKpis(data || []);
	}

  // --------------------------------------------------
  // Load scores whenever member/date range changes
  // --------------------------------------------------

  useEffect(() => {
    if (!selectedMember) {
      setScores([]);
      return;
    }

    loadScores();
  }, [
    selectedMember,
    fromDate,
    toDate,
  ]);

  // --------------------------------------------------
  // Convert month/year to comparable number
  // --------------------------------------------------

  function monthKey(month, year) {
    return Number(year) * 12 + Number(month);
  }

  // --------------------------------------------------
  // Load scores
  // --------------------------------------------------

  async function loadScores() {
    const { data, error } = await supabase
      .from("monthly_kpi_scores")
      .select(
        "id, member_id, kpi_id, month, year, value, remarks"
      )
      .eq("member_id", selectedMember);

    if (error) {
      console.error(
        "Error loading dashboard scores:",
        error
      );

      setError(
        "Unable to load KPI scores."
      );

      return;
    }

    const fromKey = monthKey(
      fromDate.month,
      fromDate.year
    );

    const toKey = monthKey(
      toDate.month,
      toDate.year
    );

    if (fromKey > toKey) {
      setScores([]);
      return;
    }

    const filteredScores = (data || []).filter(
      (score) => {
        const scoreKey = monthKey(
          score.month,
          score.year
        );

        return (
          scoreKey >= fromKey &&
          scoreKey <= toKey
        );
      }
    );

    setScores(filteredScores);
  }

  // --------------------------------------------------
  // Generate month options
  // --------------------------------------------------

  function generateMonthOptions() {
    const options = [];

    const currentYear = now.getFullYear();

    const startDate = new Date(
      currentYear,
      now.getMonth() - 24,
      1
    );

    const endDate = new Date(
      currentYear,
      now.getMonth() + 12,
      1
    );

    let date = new Date(startDate);

    while (date <= endDate) {
      options.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        label: date.toLocaleString(
          "default",
          {
            month: "long",
            year: "numeric",
          }
        ),
        shortLabel: date.toLocaleString(
          "default",
          {
            month: "short",
          }
        ),
      });

      date = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        1
      );
    }

    return options.reverse();
  }

  const monthOptions = generateMonthOptions();

  // --------------------------------------------------
  // Handle From
  // --------------------------------------------------

  function handleFromChange(event) {
    const [year, month] =
      event.target.value
        .split("-")
        .map(Number);

    setFromDate({
      month,
      year,
    });
  }

  // --------------------------------------------------
  // Handle To
  // --------------------------------------------------

  function handleToChange(event) {
    const [year, month] =
      event.target.value
        .split("-")
        .map(Number);

    setToDate({
      month,
      year,
    });
  }

  // --------------------------------------------------
  // Select month box
  // --------------------------------------------------

  function handleMonthBoxClick(option) {
    const clickedKey = monthKey(
      option.month,
      option.year
    );

    const fromKey = monthKey(
      fromDate.month,
      fromDate.year
    );

    const toKey = monthKey(
      toDate.month,
      toDate.year
    );

    // If there is currently no valid range,
    // use the clicked month as From.
    if (fromKey > toKey) {
      setFromDate({
        month: option.month,
        year: option.year,
      });

      setToDate({
        month: option.month,
        year: option.year,
      });

      return;
    }

    // If clicked before current From,
    // move From backwards.
    if (clickedKey < fromKey) {
      setFromDate({
        month: option.month,
        year: option.year,
      });

      return;
    }

    // If clicked after current To,
    // extend To.
    if (clickedKey > toKey) {
      setToDate({
        month: option.month,
        year: option.year,
      });

      return;
    }

    // If clicked inside the existing range,
    // make it the new To.
    setToDate({
      month: option.month,
      year: option.year,
    });
  }

  // --------------------------------------------------
  // Check if month is inside selected range
  // --------------------------------------------------

  function isMonthSelected(option) {
    const key = monthKey(
      option.month,
      option.year
    );

    const fromKey = monthKey(
      fromDate.month,
      fromDate.year
    );

    const toKey = monthKey(
      toDate.month,
      toDate.year
    );

    return key >= fromKey && key <= toKey;
  }

  // --------------------------------------------------
  // Check From / To
  // --------------------------------------------------

  function isFromMonth(option) {
    return (
      option.month === fromDate.month &&
      option.year === fromDate.year
    );
  }

  function isToMonth(option) {
    return (
      option.month === toDate.month &&
      option.year === toDate.year
    );
  }

  // --------------------------------------------------
  // Convert month/year to select value
  // --------------------------------------------------

  function dateSelectValue(date) {
    return `${date.year}-${String(
      date.month
    ).padStart(2, "0")}`;
  }

  // --------------------------------------------------
  // Get selected member name
  // --------------------------------------------------

  function getSelectedMemberName() {
    if (
      currentMember &&
      selectedMember ===
        currentMember.member_id
    ) {
      return currentMember.name;
    }

    const selected = members.find(
      (member) =>
        member.member_id === selectedMember
    );

    return selected?.name || "";
  }

  // --------------------------------------------------
  // Format date range
  // --------------------------------------------------

  function formatDateRange() {
    const fromLabel = new Date(
      fromDate.year,
      fromDate.month - 1
    ).toLocaleString(
      "default",
      {
        month: "long",
        year: "numeric",
      }
    );

    const toLabel = new Date(
      toDate.year,
      toDate.month - 1
    ).toLocaleString(
      "default",
      {
        month: "long",
        year: "numeric",
      }
    );

    return `${fromLabel} to ${toLabel}`;
  }

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="dashboard-loading">
        Loading dashboard...
      </div>
    );
  }

  // --------------------------------------------------
  // Error
  // --------------------------------------------------

  if (error && !currentMember) {
    return (
      <div className="dashboard-error">
        {error}
      </div>
    );
  }

  // --------------------------------------------------
  // Determine admin
  // --------------------------------------------------

  const isAdmin =
    role === "Admin" ||
    role === "Super Admin";

  // --------------------------------------------------
  // Date validation
  // --------------------------------------------------

  const validDateRange =
    monthKey(
      fromDate.month,
      fromDate.year
    ) <=
    monthKey(
      toDate.month,
      toDate.year
    );

  // --------------------------------------------------
  // Dashboard
  // --------------------------------------------------

  return (
    <div className="dashboard-page">

      {/* HEADER */}

      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>

          <p>
            Track KPI performance
            and progress over time.
          </p>
        </div>
      </div>

      {/* REGULAR USER WELCOME */}

      {!isAdmin && currentMember && (
        <div className="dashboard-welcome">
          <h2>
            Welcome, {currentMember.name}
          </h2>

          <p>
            Here's an overview of
            your recent performance.
          </p>
        </div>
      )}

      {/* FILTERS */}

      <div
        className={`dashboard-filter-card ${
          isAdmin
            ? ""
            : "dashboard-filter-card-user"
        }`}
      >

        {/* MEMBER */}

        {isAdmin && (
          <div className="dashboard-filter-field">
            <label>IS Member</label>

            <select
              value={selectedMember}
              onChange={(event) =>
                setSelectedMember(
                  event.target.value
                )
              }
            >
              <option value="">
                Select Member
              </option>

              {members.map((member) => (
                <option
                  key={member.member_id}
                  value={member.member_id}
                >
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* FROM */}

        <div className="dashboard-filter-field">
          <label>From</label>

          <select
            value={dateSelectValue(fromDate)}
            onChange={handleFromChange}
          >
            {monthOptions.map((option) => (
              <option
                key={`${option.year}-${option.month}`}
                value={`${option.year}-${String(
                  option.month
                ).padStart(2, "0")}`}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* TO */}

        <div className="dashboard-filter-field">
          <label>To</label>

          <select
            value={dateSelectValue(toDate)}
            onChange={handleToChange}
          >
            {monthOptions.map((option) => (
              <option
                key={`${option.year}-${option.month}`}
                value={`${option.year}-${String(
                  option.month
                ).padStart(2, "0")}`}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MONTH BOXES */}

      <div className="dashboard-month-picker">

        <div className="dashboard-month-picker-header">
          <div>
            <h3>Select period</h3>

            <p>
              Click a month to adjust the
              selected performance period.
            </p>
          </div>

          <span className="dashboard-month-range">
            {formatDateRange()}
          </span>
        </div>

        <div className="dashboard-month-list">
          {monthOptions.map((option) => {
            const selected =
              isMonthSelected(option);

            const from =
              isFromMonth(option);

            const to =
              isToMonth(option);

            return (
              <button
                key={`${option.year}-${option.month}`}
                type="button"
                className={`dashboard-month-box ${
                  selected
                    ? "dashboard-month-box-selected"
                    : ""
                } ${
                  from
                    ? "dashboard-month-box-from"
                    : ""
                } ${
                  to
                    ? "dashboard-month-box-to"
                    : ""
                }`}
                onClick={() =>
                  handleMonthBoxClick(option)
                }
              >
                <span className="dashboard-month-name">
                  {option.shortLabel}
                </span>

                <span className="dashboard-month-year">
                  {option.year}
                </span>

                {from && (
                  <span className="dashboard-month-tag">
                    From
                  </span>
                )}

                {to && !from && (
                  <span className="dashboard-month-tag">
                    To
                  </span>
                )}

                {from && to && (
                  <span className="dashboard-month-tag">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* INVALID DATE RANGE */}

      {!validDateRange && (
        <div className="dashboard-date-error">
          The From date cannot be later
          than the To date.
        </div>
      )}

      {/* SELECTED MEMBER */}

      {isAdmin && selectedMember && (
        <div className="dashboard-selected-member">
          Viewing performance for{" "}

          <strong>
            {getSelectedMemberName()}
          </strong>
        </div>
      )}

      {/* NO MEMBER */}

      {isAdmin && !selectedMember && (
        <div className="dashboard-no-member">

          <div className="dashboard-no-member-icon">
            ✓
          </div>

          <h3>
            Select an IS member
          </h3>

          <p>
            Select an IS member above
            to view their KPI
            performance.
          </p>

        </div>
      )}

      {/* KPI CHARTS */}

      {selectedMember && validDateRange && (
        <section className="dashboard-section">

          <div className="dashboard-section-header">
            <div>
              <h2>KPI Progress</h2>

              <p>
                KPI performance from{" "}
                {formatDateRange()}.
              </p>
            </div>
          </div>

          {kpis.length === 0 ? (
            <div className="dashboard-no-data">
              No KPIs found.
            </div>
          ) : (
            <div className="dashboard-kpi-grid">

              {kpis.map((kpi) => {
                const kpiScores =
                  scores.filter(
                    (score) =>
                      score.kpi_id ===
                      kpi.kpi_id
                  );

                return (
                  <KPIChart
                    key={kpi.kpi_id}
                    kpi={kpi}
                    scores={kpiScores}
                    fromDate={fromDate}
                    toDate={toDate}
                  />
                );
              })}

            </div>
          )}

        </section>
      )}
    </div>
  );
}

export default Dashboard;
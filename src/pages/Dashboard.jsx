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
  // Current month + previous 4 months
  // --------------------------------------------------

  const now = new Date();

  const defaultTo = {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };

  const defaultFromDate = new Date(
    now.getFullYear(),
    now.getMonth() - 4,
    1
  );

  const defaultFrom = {
    month: defaultFromDate.getMonth() + 1,
    year: defaultFromDate.getFullYear(),
  };

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  // --------------------------------------------------
  // Available months for selected member
  // --------------------------------------------------

  const [availableMonths, setAvailableMonths] =
    useState([]);

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

    // ------------------------------------------------
    // Super Admin
    // ------------------------------------------------

    if (member.role === "Super Admin") {
      await fetchAllMembers();

      setSelectedMember("");
    }

    // ------------------------------------------------
    // Admin
    // ------------------------------------------------

    else if (member.role === "Admin") {
      await fetchTeamMembers(
        member.member_id
      );

      setSelectedMember(
        member.member_id
      );
    }

    // ------------------------------------------------
    // Regular User
    // ------------------------------------------------

    else {
      setSelectedMember(
        member.member_id
      );
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
      .eq(
        "auth_user_id",
        user.id
      )
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

  async function fetchTeamMembers(
    teamLeadId
  ) {
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
        "kpi_id, name, description, unit, target_value, higher_is_better, sort_order, status"
      )
      .order("sort_order", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Error loading KPIs:",
        error
      );

      setError(
        "Unable to load KPIs."
      );

      return;
    }

    /*
     * Hidden KPIs are completely removed.
     *
     * Priority KPIs are placed first.
     *
     * Within each section, sort_order
     * determines the display order.
     */

    const visibleKPIs = (data || [])
      .filter(
        (kpi) =>
          String(
            kpi.status || ""
          ).toLowerCase() !== "hidden"
      )
      .sort((a, b) => {
        const aStatus = String(
          a.status || ""
        ).toLowerCase();

        const bStatus = String(
          b.status || ""
        ).toLowerCase();

        const aPriority =
          aStatus === "priority"
            ? 0
            : 1;

        const bPriority =
          bStatus === "priority"
            ? 0
            : 1;

        if (
          aPriority !==
          bPriority
        ) {
          return (
            aPriority -
            bPriority
          );
        }

        return (
          Number(
            a.sort_order || 0
          ) -
          Number(
            b.sort_order || 0
          )
        );
      });

    setKpis(visibleKPIs);
  }

  // --------------------------------------------------
  // Load scores whenever member/date range changes
  // --------------------------------------------------

  useEffect(() => {
    if (!selectedMember) {
      setScores([]);
      setAvailableMonths([]);
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

  function monthKey(
    month,
    year
  ) {
    return (
      Number(year) * 12 +
      Number(month)
    );
  }

  // --------------------------------------------------
  // Load scores
  // --------------------------------------------------

  async function loadScores() {
    const { data, error } =
      await supabase
        .from(
          "monthly_kpi_scores"
        )
        .select(
          "id, member_id, kpi_id, month, year, value, remarks"
        )
        .eq(
          "member_id",
          selectedMember
        );

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

    const memberScores =
      data || [];

    // ------------------------------------------------
    // Determine months that actually have values
    // ------------------------------------------------

    const monthMap =
      new Map();

    memberScores.forEach(
      (score) => {
        if (
          score.month ===
            null ||
          score.year ===
            null ||
          score.value ===
            null ||
          score.value ===
            ""
        ) {
          return;
        }

        const key = monthKey(
          score.month,
          score.year
        );

        if (
          !monthMap.has(key)
        ) {
          monthMap.set(key, {
            month:
              Number(
                score.month
              ),
            year:
              Number(
                score.year
              ),
          });
        }
      }
    );

    // ------------------------------------------------
    // Sort available months
    // Newest first
    // ------------------------------------------------

    const sortedMonths =
      Array.from(
        monthMap.values()
      ).sort((a, b) => {
        return (
          monthKey(
            b.month,
            b.year
          ) -
          monthKey(
            a.month,
            a.year
          )
        );
      });

    setAvailableMonths(
      sortedMonths
    );

    // ------------------------------------------------
    // If there are no scored months
    // ------------------------------------------------

    if (
      sortedMonths.length ===
      0
    ) {
      setScores([]);
      return;
    }

    // ------------------------------------------------
    // Make sure From and To are valid
    // for the selected member
    // ------------------------------------------------

    const availableKeys =
      new Set(
        sortedMonths.map(
          (date) =>
            monthKey(
              date.month,
              date.year
            )
        )
      );

    let adjustedFrom =
      fromDate;

    let adjustedTo =
      toDate;

    const currentFromKey =
      monthKey(
        fromDate.month,
        fromDate.year
      );

    const currentToKey =
      monthKey(
        toDate.month,
        toDate.year
      );

    // ------------------------------------------------
    // If current To date has no data,
    // use the newest available month
    // ------------------------------------------------

    if (
      !availableKeys.has(
        currentToKey
      )
    ) {
      adjustedTo =
        sortedMonths[0];
    }

    // ------------------------------------------------
    // If current From date has no data,
    // find the oldest available month that
    // is still within the intended range.
    // Otherwise use the oldest available month.
    // ------------------------------------------------

    if (
      !availableKeys.has(
        currentFromKey
      )
    ) {
      const validFromMonth =
        sortedMonths
          .filter(
            (date) =>
              monthKey(
                date.month,
                date.year
              ) <=
              monthKey(
                adjustedTo.month,
                adjustedTo.year
              )
          )
          .at(-1);

      adjustedFrom =
        validFromMonth ||
        sortedMonths[
          sortedMonths.length - 1
        ];
    }

    // ------------------------------------------------
    // Prevent invalid range
    // ------------------------------------------------

    if (
      monthKey(
        adjustedFrom.month,
        adjustedFrom.year
      ) >
      monthKey(
        adjustedTo.month,
        adjustedTo.year
      )
    ) {
      adjustedFrom =
        adjustedTo;
    }

    // ------------------------------------------------
    // Only update state if necessary
    // ------------------------------------------------

    if (
      fromDate.month !==
        adjustedFrom.month ||
      fromDate.year !==
        adjustedFrom.year
    ) {
      setFromDate(
        adjustedFrom
      );
    }

    if (
      toDate.month !==
        adjustedTo.month ||
      toDate.year !==
        adjustedTo.year
    ) {
      setToDate(
        adjustedTo
      );
    }

    // ------------------------------------------------
    // Filter scores by date range
    // ------------------------------------------------

    const fromKey =
      monthKey(
        adjustedFrom.month,
        adjustedFrom.year
      );

    const toKey =
      monthKey(
        adjustedTo.month,
        adjustedTo.year
      );

    if (
      fromKey > toKey
    ) {
      setScores([]);
      return;
    }

    const filteredScores =
      memberScores.filter(
        (score) => {
          const scoreKey =
            monthKey(
              score.month,
              score.year
            );

          return (
            scoreKey >=
              fromKey &&
            scoreKey <=
              toKey
          );
        }
      );

    setScores(
      filteredScores
    );
  }

  // --------------------------------------------------
  // Generate available month options
  //
  // Only months with a score for the selected member
  // are displayed.
  // --------------------------------------------------

  function generateAvailableMonthOptions() {
    return availableMonths.map(
      (date) => {
        const dateObject =
          new Date(
            date.year,
            date.month - 1,
            1
          );

        return {
          month:
            date.month,
          year:
            date.year,
          label:
            dateObject.toLocaleString(
              "default",
              {
                month:
                  "long",
              }
            ),
          shortLabel:
            dateObject.toLocaleString(
              "default",
              {
                month:
                  "short",
              }
            ),
          fullLabel:
            dateObject.toLocaleString(
              "default",
              {
                month:
                  "long",
                year:
                  "numeric",
              }
            ),
        };
      }
    );
  }

  const monthOptions =
    generateAvailableMonthOptions();

  // --------------------------------------------------
  // Handle From dropdown
  // --------------------------------------------------

  function handleFromChange(
    event
  ) {
    const [
      year,
      month,
    ] =
      event.target.value.split(
        "-"
      );

    const newFromDate = {
      month:
        Number(month),
      year:
        Number(year),
    };

    // ----------------------------------------------
    // Prevent From from being later than To
    // ----------------------------------------------

    if (
      monthKey(
        newFromDate.month,
        newFromDate.year
      ) >
      monthKey(
        toDate.month,
        toDate.year
      )
    ) {
      setToDate(
        newFromDate
      );
    }

    setFromDate(
      newFromDate
    );
  }

  // --------------------------------------------------
  // Handle To dropdown
  // --------------------------------------------------

  function handleToChange(
    event
  ) {
    const [
      year,
      month,
    ] =
      event.target.value.split(
        "-"
      );

    const newToDate = {
      month:
        Number(month),
      year:
        Number(year),
    };

    // ----------------------------------------------
    // Prevent To from being earlier than From
    // ----------------------------------------------

    if (
      monthKey(
        newToDate.month,
        newToDate.year
      ) <
      monthKey(
        fromDate.month,
        fromDate.year
      )
    ) {
      setFromDate(
        newToDate
      );
    }

    setToDate(
      newToDate
    );
  }

  // --------------------------------------------------
  // Current value for dropdown
  // --------------------------------------------------

  function getDateValue(
    date
  ) {
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

    const selected =
      members.find(
        (member) =>
          member.member_id ===
          selectedMember
      );

    return (
      selected?.name || ""
    );
  }

  // --------------------------------------------------
  // Format date range
  // --------------------------------------------------

  function formatDateRange() {
    const fromLabel =
      new Date(
        fromDate.year,
        fromDate.month - 1
      ).toLocaleString(
        "default",
        {
          month:
            "long",
          year:
            "numeric",
        }
      );

    const toLabel =
      new Date(
        toDate.year,
        toDate.month - 1
      ).toLocaleString(
        "default",
        {
          month:
            "long",
          year:
            "numeric",
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

  if (
    error &&
    !currentMember
  ) {
    return (
      <div className="dashboard-error">
        {error}
      </div>
    );
  }

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

      {/* ------------------------------------------ */}
      {/* HEADER */}
      {/* ------------------------------------------ */}

      <div className="dashboard-header">

        <div>

          <h1>
            Dashboard
          </h1>

          <p>
            Track KPI performance
            and progress over time.
          </p>

        </div>

      </div>

      {/* ------------------------------------------ */}
      {/* REGULAR USER WELCOME */}
      {/* ------------------------------------------ */}

      {!isAdmin &&
        currentMember && (
          <div className="dashboard-welcome">

            <h2>
              Welcome,{" "}
              {currentMember.name}
            </h2>

            <p>
              Here's an overview of
              your recent performance.
            </p>

          </div>
        )}

      {/* ------------------------------------------ */}
      {/* FILTER CARD */}
      {/* ------------------------------------------ */}

      <div
        className={`dashboard-filter-card ${
          isAdmin
            ? ""
            : "dashboard-filter-card-user"
        }`}
      >

        {/* -------------------------------------- */}
        {/* MEMBER */}
        {/* -------------------------------------- */}

        {isAdmin && (
          <div className="dashboard-filter-field">

            <label>
              IS Member
            </label>

            <select
              value={
                selectedMember
              }
              onChange={(
                event
              ) =>
                setSelectedMember(
                  event.target.value
                )
              }
            >

              <option value="">
                Select Member
              </option>

              {members.map(
                (member) => (
                  <option
                    key={
                      member.member_id
                    }
                    value={
                      member.member_id
                    }
                  >
                    {member.name}
                  </option>
                )
              )}

            </select>

          </div>
        )}

        {/* -------------------------------------- */}
        {/* FROM */}
        {/* -------------------------------------- */}

        <div className="dashboard-filter-field">

          <label>
            From
          </label>

          <select
            value={
              selectedMember &&
              monthOptions.length > 0
                ? getDateValue(
                    fromDate
                  )
                : ""
            }
            onChange={
              handleFromChange
            }
            disabled={
              !selectedMember ||
              monthOptions.length === 0
            }
          >

            {!selectedMember ? (
              <option value="">
                Select Member First
              </option>
            ) : monthOptions.length ===
              0 ? (
              <option value="">
                No scored months
              </option>
            ) : (
              monthOptions.map(
                (option) => (
                  <option
                    key={`from-${option.year}-${option.month}`}
                    value={`${option.year}-${String(
                      option.month
                    ).padStart(2, "0")}`}
                  >
                    {
                      option.fullLabel
                    }
                  </option>
                )
              )
            )}

          </select>

        </div>

        {/* -------------------------------------- */}
        {/* TO */}
        {/* -------------------------------------- */}

        <div className="dashboard-filter-field">

          <label>
            To
          </label>

          <select
            value={
              selectedMember &&
              monthOptions.length > 0
                ? getDateValue(
                    toDate
                  )
                : ""
            }
            onChange={
              handleToChange
            }
            disabled={
              !selectedMember ||
              monthOptions.length === 0
            }
          >

            {!selectedMember ? (
              <option value="">
                Select Member First
              </option>
            ) : monthOptions.length ===
              0 ? (
              <option value="">
                No scored months
              </option>
            ) : (
              monthOptions.map(
                (option) => (
                  <option
                    key={`to-${option.year}-${option.month}`}
                    value={`${option.year}-${String(
                      option.month
                    ).padStart(2, "0")}`}
                  >
                    {
                      option.fullLabel
                    }
                  </option>
                )
              )
            )}

          </select>

        </div>

      </div>

      {/* ------------------------------------------ */}
      {/* NO SCORES */}
      {/* ------------------------------------------ */}

      {selectedMember &&
        availableMonths.length ===
          0 && (
          <div className="dashboard-no-data">

            <h3>
              No KPI scores available
            </h3>

            <p>
              There are currently no
              KPI scores recorded for
              this IS member.
            </p>

          </div>
        )}

      {/* ------------------------------------------ */}
      {/* INVALID DATE RANGE */}
      {/* ------------------------------------------ */}

      {selectedMember &&
        availableMonths.length >
          0 &&
        !validDateRange && (
          <div className="dashboard-date-error">

            The From date cannot be
            later than the To date.

          </div>
        )}

      {/* ------------------------------------------ */}
      {/* SELECTED MEMBER */}
      {/* ------------------------------------------ */}

      {isAdmin &&
        selectedMember && (
          <div className="dashboard-selected-member">

            Viewing performance for{" "}

            <strong>
              {getSelectedMemberName()}
            </strong>

          </div>
        )}

      {/* ------------------------------------------ */}
      {/* NO MEMBER SELECTED */}
      {/* ------------------------------------------ */}

      {isAdmin &&
        !selectedMember && (
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

      {/* ------------------------------------------ */}
      {/* KPI CHARTS */}
      {/* ------------------------------------------ */}

      {selectedMember &&
        availableMonths.length >
          0 &&
        validDateRange && (
          <section className="dashboard-section">

            {/* -------------------------------------- */}
            {/* PRIORITY KPIs */}
            {/* -------------------------------------- */}

            {kpis.filter(
              (kpi) =>
                String(
                  kpi.status || ""
                ).toLowerCase() ===
                "priority"
            ).length > 0 && (
              <div className="dashboard-kpi-group">

                <div className="dashboard-kpi-grid">

                  {kpis
                    .filter(
                      (kpi) =>
                        String(
                          kpi.status || ""
                        ).toLowerCase() ===
                        "priority"
                    )
                    .map(
                      (kpi) => {

                        const kpiScores =
                          scores.filter(
                            (score) =>
                              score.kpi_id ===
                              kpi.kpi_id
                          );

                        return (
                          <KPIChart
                            key={
                              kpi.kpi_id
                            }
                            kpi={kpi}
                            scores={
                              kpiScores
                            }
                            fromDate={
                              fromDate
                            }
                            toDate={
                              toDate
                            }
                          />
                        );
                      }
                    )}

                </div>

              </div>
            )}

            {/* -------------------------------------- */}
            {/* DATE RANGE DIVIDER */}
            {/* -------------------------------------- */}

            <div className="dashboard-section-header">

              <div>

                <p>
                  KPI performance from{" "}
                  {formatDateRange()}.
                </p>

              </div>

            </div>

            {/* -------------------------------------- */}
            {/* ACTIVE KPIs */}
            {/* -------------------------------------- */}

            {kpis.filter(
              (kpi) =>
                String(
                  kpi.status || ""
                ).toLowerCase() !==
                  "priority" &&
                String(
                  kpi.status || ""
                ).toLowerCase() !==
                  "hidden"
            ).length > 0 ? (

              <div className="dashboard-kpi-group">

                <div className="dashboard-kpi-grid">

                  {kpis
                    .filter(
                      (kpi) =>
                        String(
                          kpi.status || ""
                        ).toLowerCase() !==
                          "priority" &&
                        String(
                          kpi.status || ""
                        ).toLowerCase() !==
                          "hidden"
                    )
                    .map(
                      (kpi) => {

                        const kpiScores =
                          scores.filter(
                            (score) =>
                              score.kpi_id ===
                              kpi.kpi_id
                          );

                        return (
                          <KPIChart
                            key={
                              kpi.kpi_id
                            }
                            kpi={kpi}
                            scores={
                              kpiScores
                            }
                            fromDate={
                              fromDate
                            }
                            toDate={
                              toDate
                            }
                          />
                        );
                      }
                    )}

                </div>

              </div>

            ) : (
              kpis.filter(
                (kpi) =>
                  String(
                    kpi.status || ""
                  ).toLowerCase() !==
                    "priority" &&
                  String(
                    kpi.status || ""
                  ).toLowerCase() !==
                    "hidden"
              ).length ===
                0 && (
                <div className="dashboard-no-data">

                  No active KPIs are
                  currently available.

                </div>
              )
            )}

          </section>
        )}

    </div>
  );
}

export default Dashboard;
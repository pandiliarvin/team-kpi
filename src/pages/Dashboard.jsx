import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import KPIChart from "../components/KPIChart";

function Dashboard() {
  const { user } = useAuth();

  const [role, setRole] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);

  const [members, setMembers] = useState([]);
  const [kpis, setKpis] = useState([]);

  // All scores belonging to the currently selected
  // member/team.
  const [scores, setScores] = useState([]);

  // --------------------------------------------------
  // Super Admin filters
  // --------------------------------------------------

  const [selectedTeamLead, setSelectedTeamLead] =
    useState("");

  const [selectedMember, setSelectedMember] =
    useState("");

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
  // Available months
  // --------------------------------------------------

  const [availableMonths, setAvailableMonths] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // Initialize
  // --------------------------------------------------

  useEffect(() => {
    if (!user) {
      return;
    }

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

      setSelectedTeamLead("");
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
      // IMPORTANT:
      // Users do not need selectedMember.
      // Their scores are always loaded using
      // currentMember.member_id.
      setSelectedMember("");
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
  // Load all members
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
     * Hidden KPIs are removed.
     *
     * Priority KPIs appear first.
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
  // Team Lead options
  //
  // A Team Lead is any member whose member_id
  // is referenced by another member's team_lead.
  // --------------------------------------------------

  const teamLeadOptions = useMemo(() => {
    if (role !== "Super Admin") {
      return [];
    }

    const teamLeadIds = new Set(
      members
        .map(
          (member) =>
            member.team_lead
        )
        .filter(Boolean)
    );

    return members
      .filter((member) =>
        teamLeadIds.has(
          member.member_id
        )
      )
      .sort((a, b) =>
        String(
          a.name || ""
        ).localeCompare(
          String(
            b.name || ""
          )
        )
      );
  }, [
    members,
    role,
  ]);

  // --------------------------------------------------
  // Super Admin member options
  //
  // If a Team Lead is selected:
  // show only that team's members.
  //
  // If no Team Lead is selected:
  // show all members.
  // --------------------------------------------------

  const superAdminMemberOptions =
    useMemo(() => {
      if (role !== "Super Admin") {
        return [];
      }

      let availableMembers =
        members;

      if (selectedTeamLead) {
        availableMembers =
          members.filter(
            (member) =>
              member.member_id ===
                selectedTeamLead ||
              member.team_lead ===
                selectedTeamLead
          );
      }

      return [
        ...availableMembers,
      ].sort((a, b) =>
        String(
          a.name || ""
        ).localeCompare(
          String(
            b.name || ""
          )
        )
      );
    }, [
      members,
      role,
      selectedTeamLead,
    ]);

  // --------------------------------------------------
  // Current selected member IDs
  //
  // This is the important part of the fix.
  //
  // User:
  //   currentMember.member_id
  //
  // Admin:
  //   selectedMember
  //
  // Super Admin:
  //   selectedMember OR all members in the
  //   selected team / all members
  // --------------------------------------------------

  const selectedMemberIds = useMemo(() => {
    if (
      role === "User"
    ) {
      return currentMember?.member_id
        ? [
            currentMember.member_id,
          ]
        : [];
    }

    if (
      role === "Admin"
    ) {
      return selectedMember
        ? [selectedMember]
        : [];
    }

    if (
      role === "Super Admin"
    ) {
      // Individual member selected.
      if (selectedMember) {
        return [
          selectedMember,
        ];
      }

      // Team Lead selected:
      // all members in that team.
      if (selectedTeamLead) {
        return members
          .filter(
            (member) =>
              member.member_id ===
                selectedTeamLead ||
              member.team_lead ===
                selectedTeamLead
          )
          .map(
            (member) =>
              member.member_id
          );
      }

      // No Team Lead and no individual:
      // all members.
      return members.map(
        (member) =>
          member.member_id
      );
    }

    return [];
  }, [
    role,
    currentMember,
    selectedMember,
    selectedTeamLead,
    members,
  ]);

  // --------------------------------------------------
  // Is the dashboard displaying a team?
  // --------------------------------------------------

  const isTeamView =
    role === "Super Admin" &&
    selectedMember === "";

  // --------------------------------------------------
  // Load scores whenever the actual selection changes
  // --------------------------------------------------

  useEffect(() => {
    if (
      selectedMemberIds.length === 0
    ) {
      setScores([]);
      setAvailableMonths([]);
      return;
    }

    loadScores(
      selectedMemberIds
    );
  }, [
    selectedMemberIds,
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

  async function loadScores(
    memberIds
  ) {
    const { data, error } =
      await supabase
        .from(
          "monthly_kpi_scores"
        )
        .select(
          "id, member_id, kpi_id, month, year, value, remarks"
        )
        .in(
          "member_id",
          memberIds
        );

    if (error) {
      console.error(
        "Error loading dashboard scores:",
        error
      );

      setError(
        "Unable to load KPI scores."
      );

      setScores([]);
      setAvailableMonths([]);

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
          score.month === null ||
          score.year === null ||
          score.value === null ||
          score.value === ""
        ) {
          return;
        }

        const numericValue =
          Number(score.value);

        if (
          Number.isNaN(
            numericValue
          )
        ) {
          return;
        }

        const key =
          monthKey(
            score.month,
            score.year
          );

        if (
          !monthMap.has(key)
        ) {
          monthMap.set(
            key,
            {
              month:
                Number(
                  score.month
                ),
              year:
                Number(
                  score.year
                ),
            }
          );
        }
      }
    );

    // ------------------------------------------------
    // Sort newest first
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
    // No scored months
    // ------------------------------------------------

    if (
      sortedMonths.length === 0
    ) {
      setScores([]);
      return;
    }

    // ------------------------------------------------
    // Make sure From and To are valid
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
    // If To doesn't exist, use newest available month
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
    // If From doesn't exist, use the oldest
    // available month within the range.
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
    // Update date state only if necessary
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
          if (
            score.month === null ||
            score.year === null
          ) {
            return false;
          }

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
  // Generate month options
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
  // Handle Team Lead change
  // --------------------------------------------------

  function handleTeamLeadChange(
    event
  ) {
    const newTeamLead =
      event.target.value;

    setSelectedTeamLead(
      newTeamLead
    );

    // Whenever the Team Lead changes,
    // reset the member selection to
    // All Team Members.
    setSelectedMember("");
  }

  // --------------------------------------------------
  // Handle member change
  // --------------------------------------------------

  function handleMemberChange(
    event
  ) {
    setSelectedMember(
      event.target.value
    );
  }

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
  // Current value for date dropdown
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
  // Get selection description
  // --------------------------------------------------

  function getSelectionDescription() {
    if (
      role === "User"
    ) {
      return currentMember?.name
        ? `Viewing performance for ${currentMember.name}.`
        : "";
    }

    if (
      role === "Super Admin"
    ) {
      if (selectedMember) {
        return `Viewing performance for ${getSelectedMemberName()}.`;
      }

      if (selectedTeamLead) {
        const teamLead =
          members.find(
            (member) =>
              member.member_id ===
              selectedTeamLead
          );

        return `Viewing team performance for ${teamLead?.name || "selected Team Lead"}.`;
      }

      return "Viewing performance for all members.";
    }

    if (
      selectedMember
    ) {
      return `Viewing performance for ${getSelectedMemberName()}.`;
    }

    return "";
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

  const isSuperAdmin =
    role === "Super Admin";

  const isUser =
    role === "User";

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
  // Determine whether there is a selection
  // --------------------------------------------------

  const hasSelection =
    selectedMemberIds.length > 0;

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

      {isUser &&
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
          isUser
            ? "dashboard-filter-card-user"
            : ""
        }`}
      >

        {/* -------------------------------------- */}
        {/* TEAM LEAD - SUPER ADMIN ONLY */}
        {/* -------------------------------------- */}

        {isSuperAdmin && (
          <div className="dashboard-filter-field">

            <label>
              Select Team Lead
            </label>

            <select
              value={
                selectedTeamLead
              }
              onChange={
                handleTeamLeadChange
              }
            >

              <option value="">
                All Members
              </option>

              {teamLeadOptions.map(
                (teamLead) => (
                  <option
                    key={
                      teamLead.member_id
                    }
                    value={
                      teamLead.member_id
                    }
                  >
                    {teamLead.name}
                  </option>
                )
              )}

            </select>

          </div>
        )}

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
              onChange={
                handleMemberChange
              }
            >

              <option value="">
                {isSuperAdmin
                  ? "All Team Members"
                  : "Select Member"}
              </option>

              {(isSuperAdmin
                ? superAdminMemberOptions
                : members
              ).map(
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
              hasSelection &&
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
              !hasSelection ||
              monthOptions.length === 0
            }
          >

            {!hasSelection ? (
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
              hasSelection &&
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
              !hasSelection ||
              monthOptions.length === 0
            }
          >

            {!hasSelection ? (
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

      {hasSelection &&
        availableMonths.length ===
          0 && (
          <div className="dashboard-no-data">

            <h3>
              No KPI scores available
            </h3>

            <p>
              There are currently no
              KPI scores recorded for
              this selection.
            </p>

          </div>
        )}

      {/* ------------------------------------------ */}
      {/* INVALID DATE RANGE */}
      {/* ------------------------------------------ */}

      {hasSelection &&
        availableMonths.length >
          0 &&
        !validDateRange && (
          <div className="dashboard-date-error">

            The From date cannot be
            later than the To date.

          </div>
        )}

      {/* ------------------------------------------ */}
      {/* SELECTED MEMBER / TEAM */}
      {/* ------------------------------------------ */}

      {hasSelection &&
        availableMonths.length >
          0 && (
          <div className="dashboard-selected-member">

            {getSelectionDescription()}

          </div>
        )}

      {/* ------------------------------------------ */}
      {/* NO MEMBER SELECTED */}
      {/* ------------------------------------------ */}

      {!hasSelection &&
        !isUser && (
          <div className="dashboard-no-member">

            <div className="dashboard-no-member-icon">
              ✓
            </div>

            <h3>
              Select an IS member
            </h3>

            <p>
              Select an IS member above
              to view KPI performance.
            </p>

          </div>
        )}

      {/* ------------------------------------------ */}
      {/* KPI CHARTS */}
      {/* ------------------------------------------ */}

      {hasSelection &&
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
                            allScores={
                              scores
                            }
                            members={
                              members
                            }
                            selectedMemberIds={
                              selectedMemberIds
                            }
                            fromDate={
                              fromDate
                            }
                            toDate={
                              toDate
                            }
                            showTable={
                              !isUser
                            }
                            isTeamView={
                              isTeamView
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
                            allScores={
                              scores
                            }
                            members={
                              members
                            }
                            selectedMemberIds={
                              selectedMemberIds
                            }
                            fromDate={
                              fromDate
                            }
                            toDate={
                              toDate
                            }
                            showTable={
                              !isUser
                            }
                            isTeamView={
                              isTeamView
                            }
                          />
                        );
                      }
                    )}

                </div>

              </div>

            ) : (
              <div className="dashboard-no-data">

                No active KPIs are
                currently available.

              </div>
            )}

          </section>
        )}

    </div>
  );
}

export default Dashboard;
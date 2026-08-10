import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";

function MonthlyKPIScores() {
  const { user } = useAuth();

  const [role, setRole] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);

  const [members, setMembers] = useState([]);
  const [kpis, setKpis] = useState([]);

  const [selectedMember, setSelectedMember] = useState("");

  const [month, setMonth] = useState(
    new Date().getMonth() + 1
  );

  const [year, setYear] = useState(
    new Date().getFullYear()
  );

  const [scores, setScores] = useState({});
  const [originalScores, setOriginalScores] =
    useState({});

  const [previousScores, setPreviousScores] =
    useState({});

  const [loading, setLoading] = useState(true);

  // --------------------------------------------------
  // Notification
  // --------------------------------------------------

  const [notification, setNotification] =
    useState(null);

  // --------------------------------------------------
  // Show notification
  // --------------------------------------------------

  function showNotification(
    message,
    type = "success"
  ) {
    setNotification({
      message,
      type,
    });
  }

  // --------------------------------------------------
  // Automatically hide notification after 5 seconds
  // --------------------------------------------------

  useEffect(() => {
    if (!notification) {
      return;
    }

    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [notification]);

  // --------------------------------------------------
  // Initialize
  // --------------------------------------------------

  useEffect(() => {
    if (!user) return;

    initializePage();
  }, [user]);

  async function initializePage() {
    setLoading(true);

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
    // Can view/edit everyone
    // ------------------------------------------------

    if (member.role === "Super Admin") {
      await fetchAllMembers();

      // No member selected initially.
      // Super Admin chooses from dropdown.
    }

    // ------------------------------------------------
    // Admin / Team Lead
    // Can view own scores + team scores
    // Can edit team members
    // ------------------------------------------------

    else if (member.role === "Admin") {
      await fetchTeamMembers(member.member_id);

      // Admin initially views their own scores
      setSelectedMember(member.member_id);
    }

    // ------------------------------------------------
    // Regular User
    // Can only view own scores
    // ------------------------------------------------

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

      return null;
    }

    return data;
  }

  // --------------------------------------------------
  // Load all members
  // Super Admin only
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
  // Load Team Lead's members + own record
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
	// Active first, then Priority
	// Hidden KPIs are excluded
	// --------------------------------------------------

	async function fetchKPIs() {
	  const { data, error } = await supabase
		.from("kpis")
		.select(
		  "kpi_id, name, unit, target_value, higher_is_better, sort_order, status"
		)
		.in("status", ["active", "priority"])
		.order("sort_order", {
		  ascending: true,
		});

	  if (error) {
		console.error(
		  "Error loading KPIs:",
		  error
		);

		return;
	  }

	  // Active KPIs first, Priority KPIs second.
	  const sortedKPIs = (data || []).sort(
		(a, b) => {
		  const statusOrder = {
			active: 1,
			priority: 2,
		  };

		  const statusDifference =
			statusOrder[a.status] -
			statusOrder[b.status];

		  // If both have the same status,
		  // keep the existing sort_order.
		  if (statusDifference === 0) {
			return (
			  (a.sort_order ?? 9999) -
			  (b.sort_order ?? 9999)
			);
		  }

		  return statusDifference;
		}
	  );

	  setKpis(sortedKPIs);
	}


  // --------------------------------------------------
  // Determine whether selected member can be edited
  // --------------------------------------------------

  function canEditSelectedMember() {
    if (!selectedMember || !currentMember) {
      return false;
    }

    // Super Admin can edit everyone
    if (role === "Super Admin") {
      return true;
    }

    // Admin can edit their team members,
    // but cannot edit their own scores
    if (role === "Admin") {
      return (
        selectedMember !==
        currentMember.member_id
      );
    }

    // Regular users cannot edit
    return false;
  }

  // --------------------------------------------------
  // Load current month scores
  // --------------------------------------------------

  useEffect(() => {
    if (!selectedMember) {
      setScores({});
      setOriginalScores({});
      setPreviousScores({});
      return;
    }

    loadScores();
  }, [
    selectedMember,
    month,
    year,
  ]);

  async function loadScores() {
    // ----------------------------------------------
    // Load current month
    // ----------------------------------------------

    const { data, error } = await supabase
      .from("monthly_kpi_scores")
      .select(
        "kpi_id, value, remarks"
      )
      .eq(
        "member_id",
        selectedMember
      )
      .eq("month", month)
      .eq("year", year);

    if (error) {
      console.error(
        "Error loading scores:",
        error
      );

      return;
    }

    const existingScores = {};

    (data || []).forEach((score) => {
      existingScores[score.kpi_id] =
        score.value;
    });

    setScores(existingScores);
    setOriginalScores(existingScores);

    // ----------------------------------------------
    // Calculate previous month
    // ----------------------------------------------

    const previousMonth =
      month === 1
        ? 12
        : month - 1;

    const previousYear =
      month === 1
        ? year - 1
        : year;

    // ----------------------------------------------
    // Load previous month scores
    // ----------------------------------------------

    const {
      data: previousData,
      error: previousError,
    } = await supabase
      .from("monthly_kpi_scores")
      .select(
        "kpi_id, value"
      )
      .eq(
        "member_id",
        selectedMember
      )
      .eq(
        "month",
        previousMonth
      )
      .eq(
        "year",
        previousYear
      );

    if (previousError) {
      console.error(
        "Error loading previous month scores:",
        previousError
      );

      setPreviousScores({});
      return;
    }

    const existingPreviousScores = {};

    (previousData || []).forEach(
      (score) => {
        existingPreviousScores[
          score.kpi_id
        ] = score.value;
      }
    );

    setPreviousScores(
      existingPreviousScores
    );
  }

  // --------------------------------------------------
  // Detect unsaved changes
  // --------------------------------------------------

  useEffect(() => {
    const scoresChanged =
      JSON.stringify(scores) !==
      JSON.stringify(originalScores);

    window.dispatchEvent(
      new CustomEvent(
        "kpi-unsaved-changes",
        {
          detail: {
            hasChanges:
              Boolean(selectedMember) &&
              scoresChanged &&
              canEditSelectedMember(),
          },
        }
      )
    );
  }, [
    scores,
    originalScores,
    selectedMember,
    role,
    currentMember,
  ]);

  // --------------------------------------------------
  // Update score
  // --------------------------------------------------

  function updateScore(
    kpiId,
    value
  ) {
    setScores(
      (previousScores) => ({
        ...previousScores,
        [kpiId]: value,
      })
    );
  }

  // --------------------------------------------------
  // Save scores
  // --------------------------------------------------

  async function saveScores() {
    if (!selectedMember) {
      showNotification(
        "Please select a member.",
        "error"
      );

      return;
    }

    if (!canEditSelectedMember()) {
      showNotification(
        "You do not have permission to edit this member's scores.",
        "error"
      );

      return;
    }

    const records = kpis
      .filter(
        (kpi) =>
          scores[
            kpi.kpi_id
          ] !== undefined &&
          scores[
            kpi.kpi_id
          ] !== ""
      )
      .map((kpi) => ({
        member_id:
          selectedMember,

        kpi_id:
          kpi.kpi_id,

        month:
          Number(month),

        year:
          Number(year),

        value:
          Number(
            scores[
              kpi.kpi_id
            ]
          ),
      }));

    if (records.length === 0) {
      showNotification(
        "Please enter at least one score.",
        "error"
      );

      return;
    }

    const { error } =
      await supabase
        .from(
          "monthly_kpi_scores"
        )
        .upsert(records, {
          onConflict:
            "member_id,kpi_id,month,year",
        });

    if (error) {
      console.error(
        "Error saving scores:",
        error
      );

      showNotification(
        error.message,
        "error"
      );

      return;
    }

    await loadScores();

    window.dispatchEvent(
      new CustomEvent(
        "kpi-unsaved-changes",
        {
          detail: {
            hasChanges: false,
          },
        }
      )
    );

    showNotification(
      "Scores saved successfully!",
      "success"
    );
  }

  // --------------------------------------------------
  // Discard unsaved changes
  // --------------------------------------------------

  useEffect(() => {
    function handleDiscardChanges() {
      setScores(
        originalScores
      );
    }

    window.addEventListener(
      "kpi-discard-changes",
      handleDiscardChanges
    );

    return () => {
      window.removeEventListener(
        "kpi-discard-changes",
        handleDiscardChanges
      );
    };
  }, [
    originalScores,
  ]);

  // --------------------------------------------------
  // Get selected member name
  // --------------------------------------------------

  function getSelectedMemberName() {
    // If viewing the logged-in user's own scores,
    // use currentMember directly.
    if (
      currentMember &&
      selectedMember ===
        currentMember.member_id
    ) {
      return currentMember.name;
    }

    // Otherwise find the selected member
    // in the loaded member list.
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
  // Get month name
  // --------------------------------------------------

  function getMonthName() {
    return new Date(
      year,
      month - 1
    ).toLocaleString(
      "default",
      {
        month: "long",
      }
    );
  }

  // --------------------------------------------------
  // Get previous month name
  // --------------------------------------------------

  function getPreviousMonthName() {
    const previousMonth =
      month === 1
        ? 12
        : month - 1;

    const previousYear =
      month === 1
        ? year - 1
        : year;

    return new Date(
      previousYear,
      previousMonth - 1
    ).toLocaleString(
      "default",
      {
        month: "long",
      }
    );
  }

  // --------------------------------------------------
  // Get previous month year
  // --------------------------------------------------

  function getPreviousMonthYear() {
    return month === 1
      ? year - 1
      : year;
  }

  // --------------------------------------------------
  // Format numbers
  // --------------------------------------------------

  function formatNumber(value) {
    const number =
      Number(value);

    if (
      Number.isNaN(number)
    ) {
      return value;
    }

    return Number.isInteger(
      number
    )
      ? number
      : number.toFixed(2);
  }

  // --------------------------------------------------
  // Check if KPI is Idle Percentage
  // --------------------------------------------------

  function isIdlePercentage(kpi) {
    return (
      kpi.name?.trim().toLowerCase() ===
      "idle percentage"
    );
  }

  // --------------------------------------------------
  // Target remark
  // --------------------------------------------------

  function getTargetRemark(kpi) {
    const score =
      scores[kpi.kpi_id];

    if (
      score === undefined ||
      score === ""
    ) {
      return null;
    }

    const numericScore =
      Number(score);

    const target =
      Number(
        kpi.target_value
      );

    if (
      Number.isNaN(
        numericScore
      ) ||
      Number.isNaN(target)
    ) {
      return null;
    }

    const difference =
      numericScore - target;

    const absoluteDifference =
      Math.abs(difference);

    const unit = kpi.unit
      ? ` ${kpi.unit}`
      : "";

    const idlePercentage =
      isIdlePercentage(kpi);

    // ----------------------------------------------
    // Exactly at target
    // ----------------------------------------------

    if (
      difference === 0
    ) {
      return {
        text: "At target",
        status: "positive",
        arrow: "✓",
      };
    }

    // ----------------------------------------------
    // Idle Percentage
    //
    // For Idle Percentage:
    // Below target = good
    // Above target = bad
    // ----------------------------------------------

    if (
      idlePercentage
    ) {
      if (
        difference > 0
      ) {
        return {
          text: `${formatNumber(
            absoluteDifference
          )}${unit} above target`,
          status:
            "negative",
          arrow: "↑",
        };
      }

      return {
        text: `${formatNumber(
          absoluteDifference
        )}${unit} below target`,
        status:
          "positive",
        arrow: "↓",
      };
    }

    // ----------------------------------------------
    // Higher is better
    // ----------------------------------------------

    if (
      kpi.higher_is_better
    ) {
      if (
        difference > 0
      ) {
        return {
          text: `${formatNumber(
            absoluteDifference
          )}${unit} above target`,
          status:
            "positive",
          arrow: "↑",
        };
      }

      return {
        text: `${formatNumber(
          absoluteDifference
        )}${unit} below target`,
        status:
          "negative",
        arrow: "↓",
      };
    }

    // ----------------------------------------------
    // Lower is better
    // ----------------------------------------------

    if (
      difference > 0
    ) {
      return {
        text: `${formatNumber(
          absoluteDifference
        )}${unit} above target`,
        status:
          "negative",
        arrow: "↑",
      };
    }

    return {
      text: `${formatNumber(
        absoluteDifference
      )}${unit} below target`,
      status:
        "positive",
      arrow: "↓",
    };
  }

  // --------------------------------------------------
  // Previous month remark
  // --------------------------------------------------

  function getPreviousMonthRemark(
    kpi
  ) {
    const score =
      scores[kpi.kpi_id];

    const previousScore =
      previousScores[
        kpi.kpi_id
      ];

    if (
      score === undefined ||
      score === "" ||
      previousScore === undefined ||
      previousScore === ""
    ) {
      return null;
    }

    const numericScore =
      Number(score);

    const numericPrevious =
      Number(
        previousScore
      );

    if (
      Number.isNaN(
        numericScore
      ) ||
      Number.isNaN(
        numericPrevious
      )
    ) {
      return null;
    }

    const difference =
      numericScore -
      numericPrevious;

    const absoluteDifference =
      Math.abs(difference);

    const unit = kpi.unit
      ? ` ${kpi.unit}`
      : "";

    const previousMonthName =
      getPreviousMonthName();

    const previousYear =
      getPreviousMonthYear();

    const previousScoreDisplay =
      `${formatNumber(
        numericPrevious
      )}${unit}`;

    // ----------------------------------------------
    // No change
    // ----------------------------------------------

    if (
      difference === 0
    ) {
      return {
        text: `No change from ${previousMonthName} ${previousYear} (${previousScoreDisplay})`,
        status:
          "neutral",
        arrow: "—",
      };
    }

    // ----------------------------------------------
    // Higher is better
    // ----------------------------------------------

    if (
      kpi.higher_is_better
    ) {
      if (
        difference > 0
      ) {
        return {
          text: `${formatNumber(
            absoluteDifference
          )}${unit} higher from ${previousMonthName} ${previousYear} (${previousScoreDisplay})`,
          status:
            "positive",
          arrow: "↑",
        };
      }

      return {
        text: `${formatNumber(
          absoluteDifference
        )}${unit} lower from ${previousMonthName} ${previousYear} (${previousScoreDisplay})`,
        status:
          "negative",
        arrow: "↓",
      };
    }

    // ----------------------------------------------
    // Lower is better
    // ----------------------------------------------

    if (
      difference > 0
    ) {
      return {
        text: `${formatNumber(
          absoluteDifference
        )}${unit} higher from ${previousMonthName} ${previousYear} (${previousScoreDisplay})`,
        status:
          "negative",
        arrow: "↑",
      };
    }

    return {
      text: `${formatNumber(
        absoluteDifference
      )}${unit} lower from ${previousMonthName} ${previousYear} (${previousScoreDisplay})`,
      status:
        "positive",
      arrow: "↓",
    };
  }

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="page-container">

        <div className="page-header">

          <h1>
            Monthly KPI Scores
          </h1>

          <p>
            View and manage KPI
            scores for each IS
            member by month.
          </p>

        </div>

        <p className="status-message">
          Loading...
        </p>

      </div>
    );
  }

  // --------------------------------------------------
  // No member found
  // --------------------------------------------------

  if (!currentMember) {
    return (
      <div className="page-container">

        <div className="page-header">

          <h1>
            Monthly KPI Scores
          </h1>

          <p>
            View and manage KPI
            scores for each IS
            member by month.
          </p>

        </div>

        <div className="error-message">
          Your account is not linked
          to a member record.
        </div>

      </div>
    );
  }

  // --------------------------------------------------
  // Page
  // --------------------------------------------------

  return (
    <div className="page-container">

      {/* ------------------------------------------ */}
      {/* PAGE HEADER */}
      {/* ------------------------------------------ */}

      <div className="page-header">

        <h1>
          Monthly KPI Scores
        </h1>

        <p>
          View and manage KPI
          scores for each IS member
          by month.
        </p>

      </div>

      {/* ------------------------------------------ */}
      {/* FILTERS */}
      {/* ------------------------------------------ */}

      <div className="scores-filter-card">

        {/* IS Member */}

        <div className="scores-field">

          <label className="scores-label">
            IS Member
          </label>

          {role === "Super Admin" ||
          role === "Admin" ? (
            <select
              className="scores-select"
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
          ) : (
            <div className="scores-member-display">
              {currentMember.name}
            </div>
          )}

        </div>

        {/* Month */}

        <div className="scores-field">

          <label className="scores-label">
            Month
          </label>

          <select
            className="scores-select"
            value={month}
            onChange={(
              event
            ) =>
              setMonth(
                Number(
                  event.target.value
                )
              )
            }
          >

            <option value={1}>
              January
            </option>

            <option value={2}>
              February
            </option>

            <option value={3}>
              March
            </option>

            <option value={4}>
              April
            </option>

            <option value={5}>
              May
            </option>

            <option value={6}>
              June
            </option>

            <option value={7}>
              July
            </option>

            <option value={8}>
              August
            </option>

            <option value={9}>
              September
            </option>

            <option value={10}>
              October
            </option>

            <option value={11}>
              November
            </option>

            <option value={12}>
              December
            </option>

          </select>

        </div>

        {/* Year */}

        <div className="scores-field scores-year-field">

          <label className="scores-label">
            Year
          </label>

          <input
            className="scores-input"
            type="number"
            value={year}
            onChange={(
              event
            ) =>
              setYear(
                Number(
                  event.target.value
                )
              )
            }
          />

        </div>

      </div>

      {/* ------------------------------------------ */}
      {/* NO MEMBER SELECTED */}
      {/* ------------------------------------------ */}

      {!selectedMember &&
        (role === "Admin" ||
          role === "Super Admin") && (
          <div className="scores-empty">

            <div className="scores-empty-icon">
              ✓
            </div>

            <h3>
              Select an IS member
            </h3>

            <p>
              Select an IS member
              above to view or enter
              their KPI scores.
            </p>

          </div>
        )}

      {/* ------------------------------------------ */}
      {/* KPI TABLE */}
      {/* ------------------------------------------ */}

      {selectedMember && (
        <>

          <div className="scores-table-header">

            <h2>
              {getSelectedMemberName()}
              's KPI Scores for{" "}
              {getMonthName()} {year}
            </h2>

          </div>

          <div className="kpi-table-wrapper">

            <table className="kpi-table">

              <thead>

                <tr>

                  <th>
                    KPI
                  </th>

                  <th>
                    Target
                  </th>

                  <th className="score-column">
                    {getMonthName()}{" "}
                    {year} Score
                  </th>

                  <th>
                    Remarks
                  </th>

                </tr>

              </thead>

              <tbody>

                {kpis.length === 0 ? (
                  <tr>

                    <td
                      colSpan="4"
                      className="kpi-empty"
                    >
                      No KPIs found.
                    </td>

                  </tr>
                ) : (
                  kpis.map(
                    (kpi) => {

                      const targetRemark =
                        getTargetRemark(
                          kpi
                        );

                      const previousRemark =
                        getPreviousMonthRemark(
                          kpi
                        );

                      return (
                        <tr
                          key={
                            kpi.kpi_id
                          }
                        >

                          {/* KPI */}

                          <td className="kpi-name">
                            {kpi.name}
                          </td>

                          {/* Target */}

                          <td>
                            {kpi.target_value ??
                              "-"}

                            {kpi.unit && (
                              <span className="target-unit">
                                {" "}
                                {kpi.unit}
                              </span>
                            )}
                          </td>

                          {/* Score */}

                          <td className="score-column">

                            {canEditSelectedMember() ? (
                              <div className="score-input-wrapper">

                                <input
                                  className="score-input"
                                  type="number"
                                  value={
                                    scores[
                                      kpi.kpi_id
                                    ] ?? ""
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateScore(
                                      kpi.kpi_id,
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                />

                                {kpi.unit && (
                                  <span className="score-unit">
                                    {kpi.unit}
                                  </span>
                                )}

                              </div>
                            ) : (
                              <div className="score-view-wrapper">

                                <span className="score-value">
                                  {scores[
                                    kpi.kpi_id
                                  ] ?? "-"}
                                </span>

                                {kpi.unit && (
                                  <span className="score-unit">
                                    {kpi.unit}
                                  </span>
                                )}

                              </div>
                            )}

                          </td>

                          {/* Remarks */}

                          <td className="remarks-cell">

                            <div className="remarks-container">

                              {targetRemark && (
                                <div
                                  className={`remark-line remark-${targetRemark.status}`}
                                >

                                  <span className="remark-arrow">
                                    {
                                      targetRemark.arrow
                                    }
                                  </span>

                                  <span>
                                    {
                                      targetRemark.text
                                    }
                                  </span>

                                </div>
                              )}

                              {previousRemark && (
                                <div
                                  className={`remark-line remark-${previousRemark.status}`}
                                >

                                  <span className="remark-arrow">
                                    {
                                      previousRemark.arrow
                                    }
                                  </span>

                                  <span>
                                    {
                                      previousRemark.text
                                    }
                                  </span>

                                </div>
                              )}

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )
                )}

              </tbody>

            </table>

          </div>

          {/* ------------------------------------------ */}
          {/* SAVE */}
          {/* ------------------------------------------ */}

          {canEditSelectedMember() && (
            <div className="scores-actions">

              <button
                className="scores-save-button"
                onClick={
                  saveScores
                }
                disabled={
                  !selectedMember
                }
              >
                Save Scores
              </button>

            </div>
          )}

        </>
      )}

      {/* =================================================
          SAVE NOTIFICATION
          ================================================= */}

      {notification && (
        <div
          className={`scores-notification scores-notification-${notification.type}`}
          role="alert"
        >

          <div className="scores-notification-icon">
            {notification.type === "success"
              ? "✓"
              : "!"}
          </div>

          <div className="scores-notification-message">
            {notification.message}
          </div>

          <button
            type="button"
            className="scores-notification-close"
            onClick={() =>
              setNotification(null)
            }
            aria-label="Close notification"
          >
            ×
          </button>

        </div>
      )}

    </div>
  );
}

export default MonthlyKPIScores;
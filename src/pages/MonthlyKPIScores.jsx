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

  const now = new Date();

  const [month, setMonth] = useState(
    now.getMonth() === 0
      ? 12
      : now.getMonth()
  );

  const [year, setYear] = useState(
    now.getMonth() === 0
      ? now.getFullYear() - 1
      : now.getFullYear()
  );

  // --------------------------------------------------
  // Earliest month with available data
  // --------------------------------------------------

  const [oldestAvailableDate, setOldestAvailableDate] =
    useState(null);

  const [loadingMonths, setLoadingMonths] =
    useState(false);

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
  // Automatically hide notification
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

  // ==================================================
  // INITIALIZE
  // ==================================================

  useEffect(() => {
    if (!user) {
      return;
    }

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
    // ------------------------------------------------

    if (member.role === "Super Admin") {
      await fetchAllMembers();
    }

    // ------------------------------------------------
    // Admin
    // ------------------------------------------------

    else if (member.role === "Admin") {
      await fetchTeamMembers(member.member_id);

      setSelectedMember(member.member_id);
    }

    // ------------------------------------------------
    // Regular User
    // ------------------------------------------------

    else {
      setSelectedMember(member.member_id);
    }

    setLoading(false);
  }

  // ==================================================
  // GET CURRENT MEMBER
  // ==================================================

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

  // ==================================================
  // LOAD ALL MEMBERS
  // ==================================================

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

  // ==================================================
  // LOAD TEAM MEMBERS
  // ==================================================

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

  // ==================================================
  // LOAD KPIs
  // Active first, then Priority
  // Hidden excluded
  // ==================================================

  async function fetchKPIs() {
    const { data, error } = await supabase
      .from("kpis")
      .select(
        "kpi_id, name, unit, target_value, higher_is_better, sort_order, status, weight"
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

    const sortedKPIs = (data || []).sort(
      (a, b) => {
        const statusOrder = {
          active: 1,
          priority: 2,
        };

        const statusDifference =
          statusOrder[a.status] -
          statusOrder[b.status];

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

  // ==================================================
  // PERMISSION
  // ==================================================

  function canEditSelectedMember() {
    if (!selectedMember || !currentMember) {
      return false;
    }

    // Super Admin can edit everyone
    if (role === "Super Admin") {
      return true;
    }

    // Admin can edit team members,
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

  // ==================================================
  // ADMIN / SUPER ADMIN CHECK
  // ==================================================

  function canSeeCalculatedScore() {
    return (
      role === "Admin" ||
      role === "Super Admin"
    );
  }

  function canSeeRawScore() {
    return (
      role === "Admin" ||
      role === "Super Admin"
    );
  }

  // ==================================================
  // IDENTIFY MONTHLY SCORE KPI
  // ==================================================

  function isMonthlyScore(kpi) {
    return (
      kpi.name
        ?.trim()
        .toLowerCase() ===
      "monthly score"
    );
  }

  // ==================================================
  // LOAD EARLIEST AVAILABLE MONTH
  // ==================================================

  useEffect(() => {
    if (!selectedMember) {
      setOldestAvailableDate(null);
      return;
    }

    loadOldestAvailableDate();
  }, [selectedMember]);

  async function loadOldestAvailableDate() {
    setLoadingMonths(true);

    const { data, error } = await supabase
      .from("monthly_kpi_scores")
      .select("month, year, value")
      .eq(
        "member_id",
        selectedMember
      )
      .not(
        "value",
        "is",
        null
      )
      .order("year", {
        ascending: true,
      })
      .order("month", {
        ascending: true,
      })
      .limit(1);

    if (error) {
      console.error(
        "Error loading oldest available month:",
        error
      );

      setOldestAvailableDate(null);
      setLoadingMonths(false);
      return;
    }

    if (!data || data.length === 0) {
      setOldestAvailableDate(null);
      setLoadingMonths(false);
      return;
    }

    const oldest = data[0];

    const oldestDate = {
      month: Number(oldest.month),
      year: Number(oldest.year),
    };

    setOldestAvailableDate(oldestDate);

    const previousCurrentMonthDate =
      getPreviousCurrentMonth();

    const oldestKey = monthKey(
      oldestDate.month,
      oldestDate.year
    );

    const latestKey = monthKey(
      previousCurrentMonthDate.month,
      previousCurrentMonthDate.year
    );

    const selectedKey = monthKey(
      Number(month),
      Number(year)
    );

    if (
      selectedKey < oldestKey ||
      selectedKey > latestKey
    ) {
      setMonth(
        previousCurrentMonthDate.month
      );

      setYear(
        previousCurrentMonthDate.year
      );
    }

    setLoadingMonths(false);
  }

  // ==================================================
  // MONTH KEY
  // ==================================================

  function monthKey(
    monthValue,
    yearValue
  ) {
    return (
      Number(yearValue) * 12 +
      Number(monthValue)
    );
  }

  // ==================================================
  // PREVIOUS CURRENT MONTH
  // ==================================================

  function getPreviousCurrentMonth() {
    const currentMonth =
      now.getMonth() + 1;

    const currentYear =
      now.getFullYear();

    if (currentMonth === 1) {
      return {
        month: 12,
        year: currentYear - 1,
      };
    }

    return {
      month: currentMonth - 1,
      year: currentYear,
    };
  }

  // ==================================================
  // MONTH OPTIONS
  // ==================================================

  function getAvailableMonthOptions() {
    if (
      !selectedMember ||
      !oldestAvailableDate
    ) {
      return [];
    }

    const latestDate =
      getPreviousCurrentMonth();

    const oldestKey = monthKey(
      oldestAvailableDate.month,
      oldestAvailableDate.year
    );

    const latestKey = monthKey(
      latestDate.month,
      latestDate.year
    );

    const selectedYear =
      Number(year);

    const options = [];

    for (
      let monthValue = 1;
      monthValue <= 12;
      monthValue++
    ) {
      const optionKey = monthKey(
        monthValue,
        selectedYear
      );

      if (
        optionKey >= oldestKey &&
        optionKey <= latestKey
      ) {
        options.push({
          value: monthValue,
          label: new Date(
            selectedYear,
            monthValue - 1
          ).toLocaleString(
            "default",
            {
              month: "long",
            }
          ),
        });
      }
    }

    return options;
  }

  const availableMonthOptions =
    getAvailableMonthOptions();

  // ==================================================
  // VALIDATE DATE
  // ==================================================

  useEffect(() => {
    if (
      !selectedMember ||
      !oldestAvailableDate
    ) {
      return;
    }

    const options =
      getAvailableMonthOptions();

    const monthExists =
      options.some(
        (option) =>
          option.value ===
          Number(month)
      );

    if (
      !monthExists &&
      options.length > 0
    ) {
      setMonth(
        options[0].value
      );
    }
  }, [
    selectedMember,
    year,
    oldestAvailableDate,
  ]);

  // ==================================================
  // LOAD CURRENT + PREVIOUS SCORES
  // ==================================================

  useEffect(() => {
    if (!selectedMember) {
      setScores({});
      setOriginalScores({});
      setPreviousScores({});
      return;
    }

    if (!oldestAvailableDate) {
      setScores({});
      setOriginalScores({});
      setPreviousScores({});
      return;
    }

    const currentKey = monthKey(
      Number(month),
      Number(year)
    );

    const oldestKey = monthKey(
      oldestAvailableDate.month,
      oldestAvailableDate.year
    );

    const latestDate =
      getPreviousCurrentMonth();

    const latestKey = monthKey(
      latestDate.month,
      latestDate.year
    );

    if (
      currentKey < oldestKey ||
      currentKey > latestKey
    ) {
      return;
    }

    loadScores();
  }, [
    selectedMember,
    month,
    year,
    oldestAvailableDate,
  ]);

  async function loadScores() {
    const {
      data,
      error,
    } = await supabase
      .from("monthly_kpi_scores")
      .select(
        "kpi_id, value, remarks"
      )
      .eq(
        "member_id",
        selectedMember
      )
      .eq(
        "month",
        Number(month)
      )
      .eq(
        "year",
        Number(year)
      );

    if (error) {
      console.error(
        "Error loading scores:",
        error
      );

      return;
    }

    const existingScores = {};

    (data || []).forEach(
      (score) => {
        existingScores[
          score.kpi_id
        ] = score.value;
      }
    );

    setScores(existingScores);
    setOriginalScores(existingScores);

    // ------------------------------------------------
    // Previous month
    // ------------------------------------------------

    const previousMonth =
      Number(month) === 1
        ? 12
        : Number(month) - 1;

    const previousYear =
      Number(month) === 1
        ? Number(year) - 1
        : Number(year);

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

  // ==================================================
  // FORMAT ALL NUMBERS TO 2 DECIMALS
  // ==================================================

  function formatNumber(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "";
    }

    const number = Number(value);

    if (
      Number.isNaN(number)
    ) {
      return value;
    }

    return number.toFixed(2);
  }

  // ==================================================
  // HANDLE SCORE INPUT
  // ==================================================

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

  // ==================================================
  // RAW SCORE CALCULATION
  // ==================================================

  function getRawScore(kpi) {
    // Monthly Score does not have a raw score
    if (isMonthlyScore(kpi)) {
      return null;
    }

    const actualScore =
      scores[kpi.kpi_id];

    if (
      actualScore === undefined ||
      actualScore === ""
    ) {
      return null;
    }

    const value =
      Number(actualScore);

    if (
      Number.isNaN(value)
    ) {
      return null;
    }

    const name =
      kpi.name
        ?.trim()
        .toLowerCase();

    // ------------------------------------------------
    // Attendance
    // ------------------------------------------------

    if (
      name === "attendance"
    ) {
      if (value >= 100) return 5;
      if (value >= 96) return 4.5;
      if (value >= 91) return 4;
      if (value >= 86) return 3.5;
      if (value >= 81) return 3;
      if (value >= 76) return 2.5;
      if (value >= 71) return 2;
      if (value >= 65) return 1.5;

      return 1;
    }

    // ------------------------------------------------
    // Idle Percentage
    //
    // 5    = 0%
    // 4.5  = 0.01 - 0.50%
    // 4    = 0.51 - 1.00%
    // 3.5  = 1.01 - 2.00%
    // 2.5  = 2.01 - 2.99%
    // 2    = 3.00%
    // 1    = above 3.00%
    // ------------------------------------------------

    if (
      name === "idle percentage"
    ) {
      if (value === 0) return 5;
      if (value <= 0.5) return 4.5;
      if (value <= 1) return 4;
      if (value <= 2) return 3.5;
      if (value < 3) return 2.5;
      if (value === 3) return 2;

      return 1;
    }

    // ------------------------------------------------
    // Activity Rate
    // ------------------------------------------------

    if (
      name === "activity rate"
    ) {
      if (value >= 61) return 5;
      if (value >= 56) return 4.5;
      if (value >= 51) return 4;
      if (value >= 46) return 3.5;
      if (value >= 41) return 3;
      if (value >= 36) return 2.5;
      if (value >= 31) return 2;
      if (value >= 21) return 1.5;

      return 1;
    }

    // ------------------------------------------------
    // Behavior
    // ------------------------------------------------

    if (
      name === "behavior"
    ) {
      return value;
    }

    // ------------------------------------------------
    // Communication
    // ------------------------------------------------

    if (
      name === "communication"
    ) {
      return value;
    }

    // ------------------------------------------------
    // QA
    // ------------------------------------------------

    if (
      name === "qa"
    ) {
      if (value >= 100) return 5;
      if (value >= 96) return 4.5;
      if (value >= 91) return 4;
      if (value >= 86) return 3.5;
      if (value >= 81) return 3;
      if (value >= 76) return 2.5;
      if (value >= 71) return 2;
      if (value >= 65) return 1.5;

      return 1;
    }

    // ------------------------------------------------
    // Fallback
    //
    // If a KPI is already scored 1-5,
    // use its actual value as its raw score.
    // ------------------------------------------------

    return value;
  }

  // ==================================================
  // CALCULATED SCORE FOR INDIVIDUAL KPI
  //
  // Raw Score / 5 * Weight
  // ==================================================

  function getCalculatedScore(kpi) {
    if (
      isMonthlyScore(kpi)
    ) {
      return null;
    }

    const rawScore =
      getRawScore(kpi);

    const weight =
      Number(kpi.weight);

    if (
      rawScore === null ||
      Number.isNaN(weight)
    ) {
      return null;
    }

    return (
      (Number(rawScore) / 5) *
      weight
    );
  }

  // ==================================================
  // TOTAL CALCULATED MONTHLY SCORE
  //
  // Adds all calculated KPI scores above
  // Monthly Score.
  // ==================================================

  function getTotalCalculatedScore() {
    let total = 0;
    let hasScore = false;

    for (const kpi of kpis) {
      // Do not include Monthly Score itself
      if (
        isMonthlyScore(kpi)
      ) {
        continue;
      }

      const calculated =
        getCalculatedScore(kpi);

      if (
        calculated !== null &&
        !Number.isNaN(calculated)
      ) {
        total += calculated;
        hasScore = true;
      }
    }

    if (!hasScore) {
      return null;
    }

    return total;
  }

  // ==================================================
  // COPY CALCULATED SCORE TO MONTHLY SCORE
  // ==================================================

  function copyCalculatedScore() {
    const total =
      getTotalCalculatedScore();

    if (total === null) {
      showNotification(
        "There is no calculated score to copy yet.",
        "error"
      );

      return;
    }

    const monthlyScoreKPI =
      kpis.find(
        (kpi) =>
          isMonthlyScore(kpi)
      );

    if (!monthlyScoreKPI) {
      return;
    }

    updateScore(
      monthlyScoreKPI.kpi_id,
      formatNumber(total)
    );

    showNotification(
      "Calculated score copied to Monthly Score.",
      "success"
    );
  }

  // ==================================================
  // DETECT UNSAVED CHANGES
  // ==================================================

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

  // ==================================================
  // SAVE SCORES
  // ==================================================

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
      .map(
        (kpi) => ({
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
        })
      );

    if (
      records.length === 0
    ) {
      showNotification(
        "Please enter at least one score.",
        "error"
      );

      return;
    }

    const {
      error,
    } =
      await supabase
        .from(
          "monthly_kpi_scores"
        )
        .upsert(
          records,
          {
            onConflict:
              "member_id,kpi_id,month,year",
          }
        );

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
    await loadOldestAvailableDate();

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

  // ==================================================
  // DISCARD UNSAVED CHANGES
  // ==================================================

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

  // ==================================================
  // SELECTED MEMBER NAME
  // ==================================================

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

  // ==================================================
  // MONTH NAME
  // ==================================================

  function getMonthName() {
    return new Date(
      Number(year),
      Number(month) - 1
    ).toLocaleString(
      "default",
      {
        month: "long",
      }
    );
  }

  // ==================================================
  // PREVIOUS MONTH NAME
  // ==================================================

  function getPreviousMonthName() {
    const previousMonth =
      Number(month) === 1
        ? 12
        : Number(month) - 1;

    const previousYear =
      Number(month) === 1
        ? Number(year) - 1
        : Number(year);

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

  // ==================================================
  // PREVIOUS MONTH YEAR
  // ==================================================

  function getPreviousMonthYear() {
    return Number(month) === 1
      ? Number(year) - 1
      : Number(year);
  }

  // ==================================================
  // IDLE PERCENTAGE
  // ==================================================

  function isIdlePercentage(kpi) {
    return (
      kpi.name
        ?.trim()
        .toLowerCase() ===
      "idle percentage"
    );
  }

  // ==================================================
  // TARGET REMARK
  // ==================================================

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

    if (
      difference === 0
    ) {
      return {
        text: "At target",
        status: "positive",
        arrow: "✓",
      };
    }

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

  // ==================================================
  // PREVIOUS MONTH REMARK
  // ==================================================

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

  // ==================================================
  // LOADING
  // ==================================================

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

  // ==================================================
  // NO MEMBER
  // ==================================================

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

  // ==================================================
  // CALCULATED MONTHLY SCORE
  // ==================================================

  const totalCalculatedScore =
    getTotalCalculatedScore();

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <div className="page-container">

      {/* PAGE HEADER */}

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

      {/* FILTERS */}

      <div className="scores-filter-card">

        {/* IS MEMBER */}

        <div className="scores-field">

          <label className="scores-label">
            IS Member
          </label>

          {role === "Super Admin" ||
          role === "Admin" ? (
            <select
              className="scores-select"
              value={selectedMember}
              onChange={(event) => {
                setSelectedMember(
                  event.target.value
                );

                setOldestAvailableDate(
                  null
                );
              }}
            >

              <option value="">
                Select Member
              </option>

              {members.map(
                (member) => (
                  <option
                    key={member.member_id}
                    value={member.member_id}
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

        {/* MONTH */}

        <div className="scores-field">

          <label className="scores-label">
            Month
          </label>

          <select
            className="scores-select"
            value={
              availableMonthOptions.some(
                (option) =>
                  option.value ===
                  Number(month)
              )
                ? month
                : ""
            }
            disabled={
              !selectedMember ||
              loadingMonths ||
              !oldestAvailableDate ||
              availableMonthOptions.length === 0
            }
            onChange={(event) =>
              setMonth(
                Number(event.target.value)
              )
            }
          >

            {!selectedMember ? (
              <option value="">
                Select member first
              </option>
            ) : loadingMonths ? (
              <option value="">
                Loading months...
              </option>
            ) : !oldestAvailableDate ? (
              <option value="">
                No previous scores found
              </option>
            ) : availableMonthOptions.length === 0 ? (
              <option value="">
                No months available
              </option>
            ) : (
              <>
                <option value="">
                  Select Month
                </option>

                {availableMonthOptions.map(
                  (monthOption) => (
                    <option
                      key={monthOption.value}
                      value={monthOption.value}
                    >
                      {monthOption.label}
                    </option>
                  )
                )}
              </>
            )}

          </select>

        </div>

        {/* YEAR */}

        <div className="scores-field scores-year-field">

          <label className="scores-label">
            Year
          </label>

          <input
            className="scores-input"
            type="number"
            value={year}
            min={
              oldestAvailableDate
                ?.year ?? 1900
            }
            max={
              getPreviousCurrentMonth().year
            }
            disabled={
              !selectedMember ||
              loadingMonths ||
              !oldestAvailableDate
            }
            onChange={(event) => {
              const newYear =
                Number(event.target.value);

              setYear(newYear);
            }}
          />

        </div>

      </div>

      {/* NO MEMBER SELECTED */}

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

      {/* NO PREVIOUS DATA */}

      {selectedMember &&
        !loadingMonths &&
        !oldestAvailableDate && (
          <div className="scores-empty">

            <div className="scores-empty-icon">
              ✓
            </div>

            <h3>
              No KPI scores found
            </h3>

            <p>
              There are no KPI scores
              recorded for{" "}
              {getSelectedMemberName()}.
            </p>

          </div>
        )}

      {/* KPI TABLE */}

      {selectedMember &&
        oldestAvailableDate &&
        availableMonthOptions.length > 0 &&
        availableMonthOptions.some(
          (option) =>
            option.value ===
            Number(month)
        ) && (
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

                    <th className="text-center">
                      Weight
                    </th>

                    <th className="text-center">
                      Target
                    </th>

                    <th className="score-column text-center">
                      {getMonthName()}{" "}
                      {year} Score
                    </th>

                    {/* RAW SCORE */}
                    {canSeeRawScore() && (
                      <th className="text-center">
                        Raw Score
                      </th>
                    )}

                    {/* CALCULATED SCORE */}
                    {canSeeCalculatedScore() && (
                      <th className="text-center">
                        Calculated Score
                      </th>
                    )}

                    <th>
                      Remarks
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {kpis.length === 0 ? (
                    <tr>

                      <td
                        colSpan={
                          canSeeCalculatedScore()
                            ? canSeeRawScore()
                              ? "7"
                              : "6"
                            : "5"
                        }
                        className="kpi-empty"
                      >
                        No KPIs found.
                      </td>

                    </tr>
                  ) : (
                    kpis.map(
                      (kpi) => {

                        const monthlyScore =
                          isMonthlyScore(kpi);

                        const rawScore =
                          getRawScore(kpi);

                        const calculatedScore =
                          getCalculatedScore(kpi);

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
                            key={kpi.kpi_id}
                            className={
                              monthlyScore
                                ? "monthly-score-row"
                                : ""
                            }
                          >

                            {/* KPI */}

                            <td className="kpi-name">

                              {kpi.name}

                              {monthlyScore && (
                                <div className="monthly-score-label">
                                  Final monthly score
                                </div>
                              )}

                            </td>

                            {/* WEIGHT */}

                            <td className="text-center">

                              {monthlyScore
                                ? "-"
                                : kpi.weight !==
                                  null &&
                                  kpi.weight !==
                                    undefined
                                ? formatNumber(
                                    kpi.weight
                                  )
                                : "-"}

                            </td>

                            {/* TARGET */}

                            <td className="text-center">

                              {kpi.target_value !==
                                null &&
                              kpi.target_value !==
                                undefined &&
                              kpi.target_value !== ""
                                ? formatNumber(
                                    kpi.target_value
                                  )
                                : "-"}

                              {kpi.unit && (
                                <span className="target-unit">
                                  {" "}
                                  {kpi.unit}
                                </span>
                              )}

                            </td>

                            {/* ACTUAL SCORE */}

                            <td className="score-column">

                              {/* -------------------------------- */}
                              {/* MONTHLY SCORE */}
                              {/* Only Admin/Super Admin may enter */}
                              {/* -------------------------------- */}

                              {monthlyScore ? (

                                canEditSelectedMember() &&
                                canSeeCalculatedScore() ? (

                                  <div className="score-input-wrapper">

                                    <input
                                      className="score-input"
                                      type="number"
                                      step="0.01"
                                      value={
                                        scores[
                                          kpi.kpi_id
                                        ] ?? ""
                                      }
                                      onChange={(event) =>
                                        updateScore(
                                          kpi.kpi_id,
                                          event.target.value
                                        )
                                      }
                                      onBlur={(event) => {
                                        const value =
                                          event.target.value;

                                        if (
                                          value !== ""
                                        ) {
                                          updateScore(
                                            kpi.kpi_id,
                                            formatNumber(
                                              value
                                            )
                                          );
                                        }
                                      }}
                                    />

                                  </div>

                                ) : (

                                  <div className="score-view-wrapper">

                                    <span className="score-value">
                                      {scores[
                                        kpi.kpi_id
                                      ] !==
                                        undefined &&
                                      scores[
                                        kpi.kpi_id
                                      ] !== ""
                                        ? formatNumber(
                                            scores[
                                              kpi.kpi_id
                                            ]
                                          )
                                        : "-"}
                                    </span>

                                  </div>

                                )

                              ) : (

                                /* -------------------------------- */
                                /* NORMAL KPI ACTUAL SCORE */
                                /* -------------------------------- */

                                canEditSelectedMember() ? (

                                  <div className="score-input-wrapper">

                                    <input
                                      className="score-input"
                                      type="number"
                                      step="0.01"
                                      value={
                                        scores[
                                          kpi.kpi_id
                                        ] ?? ""
                                      }
                                      onChange={(event) =>
                                        updateScore(
                                          kpi.kpi_id,
                                          event.target.value
                                        )
                                      }
                                      onBlur={(event) => {
                                        const value =
                                          event.target.value;

                                        if (
                                          value !== ""
                                        ) {
                                          updateScore(
                                            kpi.kpi_id,
                                            formatNumber(
                                              value
                                            )
                                          );
                                        }
                                      }}
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
                                      ] !==
                                        undefined &&
                                      scores[
                                        kpi.kpi_id
                                      ] !== ""
                                        ? formatNumber(
                                            scores[
                                              kpi.kpi_id
                                            ]
                                          )
                                        : "-"}

                                    </span>

                                    {kpi.unit && (
                                      <span className="score-unit">
                                        {kpi.unit}
                                      </span>
                                    )}

                                  </div>

                                )

                              )}

                            </td>

                            {/* RAW SCORE */}

                            {canSeeRawScore() && (
                              <td className="text-center raw-score-column">

                                {rawScore !== null
                                  ? formatNumber(
                                      rawScore
                                    )
                                  : "-"}

                              </td>
                            )}

                            {/* CALCULATED SCORE */}

                            {canSeeCalculatedScore() && (
                              <td className="text-center calculated-score-column">

                                {monthlyScore ? (

                                  totalCalculatedScore !==
                                  null ? (

                                    <div className="calculated-score-container">

                                      <span className="calculated-score-value">
                                        {formatNumber(
                                          totalCalculatedScore
                                        )}
                                      </span>

                                      {canEditSelectedMember() && (
                                        <button
                                          type="button"
                                          className="copy-score-button"
                                          onClick={
                                            copyCalculatedScore
                                          }
                                          title="Copy calculated score to Monthly Score"
                                        >
                                          Copy
                                        </button>
                                      )}

                                    </div>

                                  ) : (
                                    "-"
                                  )

                                ) : (

                                  calculatedScore !==
                                  null
                                    ? formatNumber(
                                        calculatedScore
                                      )
                                    : "-"

                                )}

                              </td>
                            )}

                            {/* REMARKS */}

                            <td className="remarks-cell">

                              <div className="remarks-container">

                                {targetRemark && (
                                  <div
                                    className={`remark-line remark-${targetRemark.status}`}
                                  >

                                    <span className="remark-arrow">
                                      {targetRemark.arrow}
                                    </span>

                                    <span>
                                      {targetRemark.text}
                                    </span>

                                  </div>
                                )}

                                {previousRemark && (
                                  <div
                                    className={`remark-line remark-${previousRemark.status}`}
                                  >

                                    <span className="remark-arrow">
                                      {previousRemark.arrow}
                                    </span>

                                    <span>
                                      {previousRemark.text}
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

            {/* SAVE */}

            {canEditSelectedMember() && (
              <div className="scores-actions">

                <button
                  className="scores-save-button"
                  onClick={saveScores}
                  disabled={!selectedMember}
                >
                  Save Scores
                </button>

              </div>
            )}

          </>
        )}

      {/* NOTIFICATION */}

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
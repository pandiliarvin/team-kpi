function KPIChart({
  kpi,
  scores = [],
  allScores = [],
  fromDate,
  toDate,
  members = [],
  selectedMemberIds = [],
  showTable = false,
  isTeamView = false,
}) {
  const chartWidth = 600;
  const chartHeight = 260;

  const padding = {
    top: 35,
    right: 25,
    bottom: 45,
    left: 50,
  };

  const graphWidth =
    chartWidth -
    padding.left -
    padding.right;

  const graphHeight =
    chartHeight -
    padding.top -
    padding.bottom;

  // ==================================================
  // GENERATE MONTHS IN RANGE
  // ==================================================

  function getMonthsInRange() {
    const months = [];

    let year = Number(fromDate.year);
    let month = Number(fromDate.month);

    while (
      year < Number(toDate.year) ||
      (
        year === Number(toDate.year) &&
        month <= Number(toDate.month)
      )
    ) {
      months.push({
        month,
        year,
      });

      month++;

      if (month > 12) {
        month = 1;
        year++;
      }
    }

    return months;
  }

  const months = getMonthsInRange();

  // ==================================================
  // FORMAT VALUE
  // ==================================================

  function formatValue(value) {
    if (
      value === null ||
      value === undefined ||
      Number.isNaN(Number(value))
    ) {
      return "—";
    }

    return Number(value).toFixed(2);
  }

  // ==================================================
  // FORMAT MONTH
  // ==================================================

  function formatMonth(month, year) {
    return new Date(
      Number(year),
      Number(month) - 1,
      1
    ).toLocaleDateString(
      "en-US",
      {
        month: "short",
        year:
          months.length > 12
            ? "2-digit"
            : undefined,
      }
    );
  }

  // ==================================================
  // GET INDIVIDUAL MEMBER SCORE
  // ==================================================

  function getMemberScore(
    memberId,
    month,
    year
  ) {
    const score = allScores.find(
      (item) =>
        String(item.member_id) ===
          String(memberId) &&
        String(item.kpi_id) ===
          String(kpi.kpi_id) &&
        Number(item.month) ===
          Number(month) &&
        Number(item.year) ===
          Number(year)
    );

    if (
      !score ||
      score.value === null ||
      score.value === ""
    ) {
      return null;
    }

    const value = Number(score.value);

    return Number.isNaN(value)
      ? null
      : value;
  }

  // ==================================================
  // GET TEAM AVERAGE FOR A MONTH
  // ==================================================

  function getTeamAverage(
    month,
    year
  ) {
    if (
      !selectedMemberIds ||
      selectedMemberIds.length === 0
    ) {
      return null;
    }

    const values = selectedMemberIds
      .map((memberId) =>
        getMemberScore(
          memberId,
          month,
          year
        )
      )
      .filter(
        (value) => value !== null
      );

    if (values.length === 0) {
      return null;
    }

    const total = values.reduce(
      (sum, value) =>
        sum + value,
      0
    );

    return total / values.length;
  }

  // ==================================================
  // GET INDIVIDUAL SCORE
  //
  // Used when viewing one member.
  // ==================================================

  function getIndividualScore(
    month,
    year
  ) {
    const score = scores.find(
      (item) =>
        Number(item.month) ===
          Number(month) &&
        Number(item.year) ===
          Number(year)
    );

    if (
      !score ||
      score.value === null ||
      score.value === ""
    ) {
      return null;
    }

    const value = Number(score.value);

    return Number.isNaN(value)
      ? null
      : value;
  }

  // ==================================================
  // CHART DATA
  //
  // Team view:
  //     chart = team average
  //
  // Individual view:
  //     chart = individual score
  // ==================================================

  const chartData = months.map(
    (monthData) => {
      let value = null;

      if (isTeamView) {
        value = getTeamAverage(
          monthData.month,
          monthData.year
        );
      } else {
        value = getIndividualScore(
          monthData.month,
          monthData.year
        );
      }

      return {
        ...monthData,
        value,
      };
    }
  );

  // ==================================================
  // ACTUAL CHART VALUES
  // ==================================================

  const actualValues = chartData
    .map((item) => item.value)
    .filter(
      (value) => value !== null
    );

  // ==================================================
  // TARGET
  // ==================================================

  const targetValue = Number(
    kpi.target_value
  );

  const hasTarget =
    !Number.isNaN(targetValue);

  // ==================================================
  // EMPTY CHART
  // ==================================================

  if (actualValues.length === 0) {
    return (
      <div className="dashboard-kpi-card">

        <div className="dashboard-kpi-header">

          <div>

            <h3>
              {kpi.name}
            </h3>

            <p>
              {kpi.description
                ? `${kpi.description} `
                : ""}

              {hasTarget && (
                <span>
                  (target:{" "}
                  {formatValue(
                    targetValue
                  )}{" "}
                  {kpi.unit || ""})
                </span>
              )}
            </p>

          </div>

        </div>

        <div className="dashboard-empty-chart">
          No score data available
          for this period.
        </div>

        {/* ========================================== */}
        {/* TABLE */}
        {/* ========================================== */}

        {showTable &&
          members.length > 0 && (
            <div className="dashboard-score-table-wrapper">

              <table className="dashboard-score-table">

                <thead>
                  <tr>

                    <th>
                      Member
                    </th>

                    {months.map(
                      (monthData) => (
                        <th
                          key={`header-${monthData.year}-${monthData.month}`}
                        >
                          {formatMonth(
                            monthData.month,
                            monthData.year
                          )}
                        </th>
                      )
                    )}

                    <th>
                      Average
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {members
                    .filter((member) =>
                      selectedMemberIds.includes(
                        member.member_id
                      )
                    )
                    .map((member) => {

                      const memberValues =
                        months
                          .map(
                            (monthData) =>
                              getMemberScore(
                                member.member_id,
                                monthData.month,
                                monthData.year
                              )
                          )
                          .filter(
                            (value) =>
                              value !== null
                          );

                      const average =
                        memberValues.length > 0
                          ? memberValues.reduce(
                              (sum, value) =>
                                sum + value,
                              0
                            ) /
                            memberValues.length
                          : null;

                      return (
                        <tr
                          key={
                            member.member_id
                          }
                        >

                          <td className="dashboard-score-member">
                            {member.name}
                          </td>

                          {months.map(
                            (monthData) => {

                              const score =
                                getMemberScore(
                                  member.member_id,
                                  monthData.month,
                                  monthData.year
                                );

                              return (
                                <td
                                  key={`${member.member_id}-${monthData.year}-${monthData.month}`}
                                  className="dashboard-score-value"
                                >
                                  {score !==
                                  null
                                    ? formatValue(
                                        score
                                      )
                                    : "—"}
                                </td>
                              );
                            }
                          )}

                          <td className="dashboard-score-average">
                            {average !==
                            null
                              ? formatValue(
                                  average
                                )
                              : "—"}
                          </td>

                        </tr>
                      );
                    })}

                </tbody>

              </table>

              {/* ==================================== */}
              {/* TEAM AVERAGE */}
              {/* ==================================== */}

              {isTeamView && (
                <div
                  className="dashboard-team-average"
                  style={{
                    fontWeight: "700",
                    marginTop: "12px",
                    padding: "10px 12px",
                    textAlign: "right",
                  }}
                >
                  Team Average
                </div>
              )}

            </div>
          )}

      </div>
    );
  }

  // ==================================================
  // CHART RANGE
  // ==================================================

  const allChartValues = hasTarget
    ? [
        ...actualValues,
        targetValue,
      ]
    : actualValues;

  const dataMin =
    Math.min(...allChartValues);

  const dataMax =
    Math.max(...allChartValues);

  let chartMin;
  let chartMax;

  if (dataMin === dataMax) {
    const paddingAmount =
      Math.max(
        Math.abs(dataMin) * 0.15,
        5
      );

    chartMin =
      dataMin -
      paddingAmount;

    chartMax =
      dataMax +
      paddingAmount;
  } else {
    const range =
      dataMax - dataMin;

    const paddingAmount =
      range * 0.15;

    chartMin =
      dataMin -
      paddingAmount;

    chartMax =
      dataMax +
      paddingAmount;
  }

  // Keep zero visible when all values are positive.

  if (
    dataMin >= 0 &&
    chartMin > 0
  ) {
    chartMin = 0;
  }

  const valueRange =
    chartMax - chartMin;

  // ==================================================
  // COORDINATES
  // ==================================================

  function getX(index) {
    if (months.length === 1) {
      return (
        padding.left +
        graphWidth / 2
      );
    }

    return (
      padding.left +
      (index /
        (months.length - 1)) *
        graphWidth
    );
  }

  function getY(value) {
    return (
      padding.top +
      graphHeight -
      ((value - chartMin) /
        valueRange) *
        graphHeight
    );
  }

  // ==================================================
  // POINTS
  // ==================================================

  const points = chartData.map(
    (item, index) => ({
      ...item,
      x: getX(index),
      y:
        item.value !== null
          ? getY(item.value)
          : null,
    })
  );

  // ==================================================
  // LINE SEGMENTS
  // ==================================================

  const segments = [];

  let currentSegment = [];

  points.forEach((point) => {
    if (point.value === null) {
      if (
        currentSegment.length > 0
      ) {
        segments.push(
          currentSegment
        );

        currentSegment = [];
      }
    } else {
      currentSegment.push(point);
    }
  });

  if (
    currentSegment.length > 0
  ) {
    segments.push(
      currentSegment
    );
  }

  // ==================================================
  // GRID
  // ==================================================

  const gridCount = 4;

  const gridLines =
    Array.from(
      {
        length:
          gridCount + 1,
      },
      (_, index) => {
        const value =
          chartMin +
          (valueRange /
            gridCount) *
            index;

        return {
          value,
          y: getY(value),
        };
      }
    );

  // ==================================================
  // TARGET LINE
  // ==================================================

  const targetY = hasTarget
    ? getY(targetValue)
    : null;

  // ==================================================
  // MEMBER TABLE
  // ==================================================

  const filteredMembers =
    members.filter((member) =>
      selectedMemberIds.includes(
        member.member_id
      )
    );

  // ==================================================
  // MEMBER AVERAGE
  // ==================================================

  function getMemberAverage(
    memberId
  ) {
    const memberValues =
      months
        .map(
          (monthData) =>
            getMemberScore(
              memberId,
              monthData.month,
              monthData.year
            )
        )
        .filter(
          (value) =>
            value !== null
        );

    if (
      memberValues.length === 0
    ) {
      return null;
    }

    const total =
      memberValues.reduce(
        (sum, value) =>
          sum + value,
        0
      );

    return (
      total /
      memberValues.length
    );
  }

  // ==================================================
  // TEAM AVERAGE OVER ENTIRE PERIOD
  // ==================================================

  function getOverallTeamAverage() {
    const values = [];

    filteredMembers.forEach(
      (member) => {
        months.forEach(
          (monthData) => {
            const score =
              getMemberScore(
                member.member_id,
                monthData.month,
                monthData.year
              );

            if (
              score !== null
            ) {
              values.push(score);
            }
          }
        );
      }
    );

    if (values.length === 0) {
      return null;
    }

    const total =
      values.reduce(
        (sum, value) =>
          sum + value,
        0
      );

    return (
      total /
      values.length
    );
  }

  const overallTeamAverage =
    getOverallTeamAverage();

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="dashboard-kpi-card">

      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}

      <div className="dashboard-kpi-header">

        <div>

          <h3>
            {kpi.name}
          </h3>

          <p>

            {kpi.description
              ? `${kpi.description} `
              : ""}

            {hasTarget && (
              <span>
                (target:{" "}
                {formatValue(
                  targetValue
                )}{" "}
                {kpi.unit || ""})
              </span>
            )}

          </p>

        </div>

      </div>

      {/* ============================================ */}
      {/* CHART */}
      {/* ============================================ */}

      <div className="dashboard-chart-wrapper">

        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="dashboard-chart"
        >

          {/* ======================================== */}
          {/* GRID */}
          {/* ======================================== */}

          {gridLines.map(
            (line, index) => (
              <g key={index}>

                <line
                  x1={
                    padding.left
                  }
                  y1={line.y}
                  x2={
                    chartWidth -
                    padding.right
                  }
                  y2={line.y}
                  className="dashboard-chart-grid"
                />

                <text
                  x={
                    padding.left -
                    10
                  }
                  y={
                    line.y + 4
                  }
                  textAnchor="end"
                  className="dashboard-chart-label"
                >
                  {formatValue(
                    line.value
                  )}
                </text>

              </g>
            )
          )}

          {/* ======================================== */}
          {/* X AXIS */}
          {/* ======================================== */}

          <line
            x1={
              padding.left
            }
            y1={
              padding.top +
              graphHeight
            }
            x2={
              chartWidth -
              padding.right
            }
            y2={
              padding.top +
              graphHeight
            }
            className="dashboard-chart-axis"
          />

          {/* ======================================== */}
          {/* TARGET */}
          {/* ======================================== */}

          {hasTarget && (
            <>

              <line
                x1={
                  padding.left
                }
                y1={targetY}
                x2={
                  chartWidth -
                  padding.right
                }
                y2={targetY}
                className="dashboard-chart-target"
              />

              <text
                x={
                  chartWidth -
                  padding.right
                }
                y={
                  targetY - 7
                }
                textAnchor="end"
                className="dashboard-chart-target-label"
              >
                Target:{" "}
                {formatValue(
                  targetValue
                )}
              </text>

            </>
          )}

          {/* ======================================== */}
          {/* KPI LINE */}
          {/* ======================================== */}

          {segments.map(
            (
              segment,
              segmentIndex
            ) => {

              const linePoints =
                segment
                  .map(
                    (point) =>
                      `${point.x},${point.y}`
                  )
                  .join(" ");

              return (
                <polyline
                  key={
                    segmentIndex
                  }
                  points={
                    linePoints
                  }
                  fill="none"
                  className="dashboard-chart-line"
                />
              );
            }
          )}

          {/* ======================================== */}
          {/* DATA POINTS */}
          {/* ======================================== */}

          {points.map(
            (
              point,
              index
            ) => (
              <g
                key={index}
              >

                {point.value !==
                  null && (
                  <>

                    <circle
                      cx={
                        point.x
                      }
                      cy={
                        point.y
                      }
                      r="5"
                      className="dashboard-chart-point"
                    />

                    <text
                      x={
                        point.x
                      }
                      y={
                        point.y -
                        12
                      }
                      textAnchor="middle"
                      className="dashboard-chart-value"
                    >
                      {formatValue(
                        point.value
                      )}
                    </text>

                  </>
                )}

                <text
                  x={
                    point.x
                  }
                  y={
                    chartHeight -
                    15
                  }
                  textAnchor="middle"
                  className="dashboard-chart-label"
                >
                  {formatMonth(
                    point.month,
                    point.year
                  )}
                </text>

              </g>
            )
          )}

        </svg>

      </div>

      {/* ============================================ */}
      {/* MEMBER SCORE TABLE */}
      {/* ============================================ */}

      {showTable &&
        filteredMembers.length > 0 && (
          <div className="dashboard-score-table-wrapper">

            <table className="dashboard-score-table">

              <thead>

                <tr>

                  <th>
                    Member
                  </th>

                  {months.map(
                    (monthData) => (
                      <th
                        key={`header-${monthData.year}-${monthData.month}`}
                      >
                        {formatMonth(
                          monthData.month,
                          monthData.year
                        )}
                      </th>
                    )
                  )}

                  <th>
                    Average
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredMembers.map(
                  (member) => {

                    const average =
                      getMemberAverage(
                        member.member_id
                      );

                    return (
                      <tr
                        key={
                          member.member_id
                        }
                      >

                        <td className="dashboard-score-member">
                          {member.name}
                        </td>

                        {months.map(
                          (monthData) => {

                            const score =
                              getMemberScore(
                                member.member_id,
                                monthData.month,
                                monthData.year
                              );

                            return (
                              <td
                                key={`${member.member_id}-${monthData.year}-${monthData.month}`}
                                className="dashboard-score-value"
                              >
                                {score !==
                                null
                                  ? formatValue(
                                      score
                                    )
                                  : "—"}
                              </td>
                            );
                          }
                        )}

                        <td className="dashboard-score-average">
                          {average !==
                          null
                            ? formatValue(
                                average
                              )
                            : "—"}
                        </td>

                      </tr>
                    );
                  }
                )}

                {/* ================================== */}
                {/* TEAM AVERAGE ROW */}
                {/* ================================== */}

                {isTeamView && (
                  <tr
                    className="dashboard-team-average-row"
                    style={{
                      fontWeight: "700",
                    }}
                  >

                    <td
                      className="dashboard-score-member"
                      style={{
                        fontWeight: "700",
                      }}
                    >
                      Team Average
                    </td>

                    {months.map(
                      (monthData) => {

                        const average =
                          getTeamAverage(
                            monthData.month,
                            monthData.year
                          );

                        return (
                          <td
                            key={`team-average-${monthData.year}-${monthData.month}`}
                            className="dashboard-score-value"
                            style={{
                              fontWeight:
                                "700",
                            }}
                          >
                            {average !==
                            null
                              ? formatValue(
                                  average
                                )
                              : "—"}
                          </td>
                        );
                      }
                    )}

                    <td
                      className="dashboard-score-average"
                      style={{
                        fontWeight:
                          "700",
                      }}
                    >
                      {overallTeamAverage !==
                      null
                        ? formatValue(
                            overallTeamAverage
                          )
                        : "—"}
                    </td>

                  </tr>
                )}

              </tbody>

            </table>

          </div>
        )}

    </div>
  );
}

export default KPIChart;
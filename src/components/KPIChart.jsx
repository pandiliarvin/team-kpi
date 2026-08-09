function KPIChart({
  kpi,
  scores,
  fromDate,
  toDate,
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

  // --------------------------------------------------
  // Generate every month in the selected range
  // --------------------------------------------------

  function getMonthsInRange() {
    const months = [];

    let year = fromDate.year;
    let month = fromDate.month;

    while (
      year < toDate.year ||
      (
        year === toDate.year &&
        month <= toDate.month
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

  // --------------------------------------------------
  // Find score for a particular month
  // --------------------------------------------------

  function getScore(month, year) {
    const score = scores.find(
      (item) =>
        Number(item.month) === month &&
        Number(item.year) === year
    );

    if (!score) {
      return null;
    }

    const value = Number(score.value);

    return Number.isNaN(value)
      ? null
      : value;
  }

  const chartData = months.map(
    (monthData) => ({
      ...monthData,
      value: getScore(
        monthData.month,
        monthData.year
      ),
    })
  );

  // --------------------------------------------------
  // Values that actually exist
  // --------------------------------------------------

  const actualValues = chartData
    .map((item) => item.value)
    .filter(
      (value) => value !== null
    );

  // --------------------------------------------------
  // Target value
  // --------------------------------------------------

  const targetValue = Number(
    kpi.target_value
  );

  const hasTarget =
    !Number.isNaN(targetValue);

  // --------------------------------------------------
  // Empty chart
  // --------------------------------------------------

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

      </div>
    );
  }

  // --------------------------------------------------
  // Determine chart range
  // Include target in the range so the
  // target line is always visible.
  // --------------------------------------------------

  const allChartValues = hasTarget
    ? [...actualValues, targetValue]
    : actualValues;

  const dataMin =
    Math.min(...allChartValues);

  const dataMax =
    Math.max(...allChartValues);

  let chartMin;
  let chartMax;

  // If all values are identical,
  // create some vertical breathing room.
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

  // --------------------------------------------------
  // Coordinate helpers
  // --------------------------------------------------

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

  // --------------------------------------------------
  // Build chart points
  // --------------------------------------------------

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

  // --------------------------------------------------
  // Build line segments
  // --------------------------------------------------

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

  // --------------------------------------------------
  // Format month
  // --------------------------------------------------

  function formatMonth(
    month,
    year
  ) {
    return new Date(
      year,
      month - 1,
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

  // --------------------------------------------------
  // Format score
  // --------------------------------------------------

  function formatValue(value) {
    if (
      Number.isInteger(value)
    ) {
      return value;
    }

    return Number(
      value.toFixed(2)
    );
  }

  // --------------------------------------------------
  // Y-axis labels
  // --------------------------------------------------

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

  // --------------------------------------------------
  // Target line
  // --------------------------------------------------

  const targetY = hasTarget
    ? getY(targetValue)
    : null;

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="dashboard-kpi-card">

      {/* ------------------------------------------ */}
      {/* HEADER */}
      {/* ------------------------------------------ */}

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

      {/* ------------------------------------------ */}
      {/* CHART */}
      {/* ------------------------------------------ */}

      <div className="dashboard-chart-wrapper">

        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="dashboard-chart"
        >

          {/* ------------------------------------ */}
          {/* Grid */}
          {/* ------------------------------------ */}

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

          {/* ------------------------------------ */}
          {/* X Axis */}
          {/* ------------------------------------ */}

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

          {/* ------------------------------------ */}
          {/* Target Line */}
          {/* ------------------------------------ */}

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

          {/* ------------------------------------ */}
          {/* KPI Lines */}
          {/* ------------------------------------ */}

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

          {/* ------------------------------------ */}
          {/* Data Points */}
          {/* ------------------------------------ */}

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

    </div>
  );
}

export default KPIChart;
const sql = require("mssql")

// SQL Server configuration
const sqlConfig = {
  server: "10.255.20.23",
  user: "wms",
  password: "!@#wms!@#",
  database: "A944_Emami",
  port: 1433,
  options: {
    encrypt: false, // For Azure use true
    trustServerCertificate: true, // Change to true for local dev / self-signed certs
    connectionTimeout: 30000, // 30 seconds
    requestTimeout: 30000, // 30 seconds
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

// Create a connection pool
let pool

/**
 * Initialize the SQL Server connection pool
 */
async function initSqlPool() {
  try {
    if (!pool) {
      console.log("Initializing SQL Server connection pool...")
      pool = await sql.connect(sqlConfig)
      console.log("SQL Server connection pool initialized successfully")
    }
    return pool
  } catch (err) {
    console.error("Error initializing SQL Server connection pool:", err)
    // Don't throw the error, just log it - this allows the application to start even if SQL Server is not available
    console.error("Application will continue without SQL Server connection")
    return null
  }
}

/**
 * Execute a SQL query
 * @param {string} query - SQL query to execute
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function executeQuery(query, params = {}) {
  try {
    if (!pool) {
      await initSqlPool()

      // If pool is still null after initialization attempt, return empty array
      if (!pool) {
        console.error("SQL Server connection pool is not available")
        return []
      }
    }

    console.log("Executing SQL query:", query)
    console.log("With parameters:", params)

    const request = pool.request()

    // Add parameters to the request
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value)
    })

    const result = await request.query(query)
    console.log(`SQL query executed successfully. Returned ${result.recordset.length} rows.`)

    return result.recordset
  } catch (err) {
    console.error("Error executing SQL query:", err)
    // Return empty array instead of throwing error
    return []
  }
}

/**
 * Get pallet data from SQL Server
 * @param {string} lineFilter - Line filter (e.g., 'Line-4')
 * @param {string} filterDate - Date to filter by (YYYY-MM-DD)
 * @param {number} subtractValue - Value to subtract from line number
 * @returns {Promise<Array>} Pallet data
 */
async function getPalletData(lineFilter, filterDate, subtractValue = 4) {
  const query = `
    DECLARE @LineFilter NVARCHAR(50) = @lineFilterParam;
    DECLARE @SubtractValue INT = @subtractValueParam;
    DECLARE @FilterDate DATE = @filterDateParam;

    SELECT
        [Pallet Barcode] AS PalletBarcode,
        [Batch No] AS BatchNo,
        [SKU_Code] AS SKUCode,
        [SKU_Description] AS SKUDescription,
        [Box Count] AS BoxCount,
        [IsFull] AS IsFull,
        [OperationType] AS OperationType,
        [OrderNo] AS OrderNo,
        [Robot No] AS RobotNo,
        [Line] AS Line,
        [Scan Time] AS ScanTime,
        [PalletStatus] AS PalletStatus,
        TRY_CAST(SUBSTRING([Line], PATINDEX('%[0-9]%', [Line]), LEN([Line])) AS INT) - @SubtractValue AS LineMinus
    FROM
        [A944_Emami].[dbo].[View_StagingTable]
    WHERE
        CAST(TRY_PARSE([Scan Time] AS DATETIME USING 'en-GB') AS DATE) = @FilterDate
        AND [Line] LIKE '%' + @LineFilter + '%'
    ORDER BY
        TRY_PARSE([Scan Time] AS DATETIME USING 'en-GB') DESC;
  `

  const params = {
    lineFilterParam: lineFilter,
    subtractValueParam: subtractValue,
    filterDateParam: filterDate,
  }

  return executeQuery(query, params)
}

/**
 * Close the SQL Server connection pool
 */
async function closeSqlPool() {
  try {
    if (pool) {
      await pool.close()
      console.log("SQL Server connection pool closed")
      pool = null
    }
  } catch (err) {
    console.error("Error closing SQL Server connection pool:", err)
    // Don't throw the error, just log it
  }
}

module.exports = {
  initSqlPool,
  executeQuery,
  getPalletData,
  closeSqlPool,
}

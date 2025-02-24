

const pool = require('../utils/pool');

const generatePropertyUniqueId = async (req, res, next) => {
  const { schemeName, registrationDate } = req.body;

  if (!schemeName || !registrationDate) {
    return res.status(400).send('Scheme Name and Registration Date are required to generate Property Unique ID');
  }

  const schemePrefix = schemeName.substring(0, 3).toUpperCase(); // First 3 characters of scheme_name
  const date = new Date(registrationDate);
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYYMM format
  const prefix = `${schemePrefix}${yearMonth}`; // Prefix for property_unique_id

  try {
    // Query the database to get the latest property_unique_id with the same prefix
    const query = `SELECT property_unique_id FROM property WHERE property_unique_id LIKE '${prefix}%' ORDER BY property_unique_id DESC LIMIT 1`;
    const [rows] = await pool.promise().query(query);

    let counter = 1; // Default counter if no existing IDs found
    if (rows.length > 0) {
      const lastId = rows[0].property_unique_id;
      const lastCounter = parseInt(lastId.slice(-3), 10); // Extract last 3 digits
      counter = lastCounter + 1; // Increment the counter
    }

    const uniqueId = `${prefix}${String(counter).padStart(3, '0')}`; // Generate new ID
    req.body.propertyId = uniqueId; // Add the generated ID to the request body

    next(); // Pass control to the next middleware/route
  } catch (error) {
    console.error('Error generating property_unique_id:', error);
    return res.status(500).send('Error generating Property Unique ID');
  }
};
  module.exports = generatePropertyUniqueId

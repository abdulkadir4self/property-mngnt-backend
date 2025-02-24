const express = require('express');
const router = express.Router();
const pool = require('../utils/pool');
const generateNewPropertyUniqueId =  require('../middleware/NewPropertyUniqueId');
const upload = require('../middleware/UploadMiddleWare');

// u can change upload photo route if problem arises. for testing i kept it same.


router.post(
    '/',
    upload.fields([
      { name: 'ownerPhoto', maxCount: 1 },
      { name: 'document', maxCount: 1 },
    ]),
    generateNewPropertyUniqueId,
    (req, res) => {
      try {
        const formData = req.body;
        const files = req.files;
  
        // Parse paymentHistory and serviceChargeHistory as JSON strings
        let paymentHistory = [];
        let serviceChargeHistory = [];
        try {
          paymentHistory = JSON.parse(formData.paymentHistory || '[]');
          serviceChargeHistory = JSON.parse(formData.serviceChargeHistory || '[]');
        } catch (error) {
          console.error('Error parsing paymentHistory or serviceChargeHistory:', error);
          return res.status(400).json({
            message: 'Invalid format for paymentHistory or serviceChargeHistory',
          });
        }
  
        const ownerPhotoPath = files?.ownerPhoto?.[0]?.path || null;
        const documentPath = files?.document?.[0]?.path || null;
  
        // Step 1: Insert data into the property table
        const propertyQuery = `
          INSERT INTO new_property (
            scheme_name, scheme_id, serial_number ,property_unique_id, allottee_name, fathers_husbands_name,
            permanent_address, current_address, mobile_number, property_category, shop_number, property_number,
            registration_amount, registration_date, allotment_amount, allotment_date, sale_price, e_auction_price,
            freehold_amount, lease_rent_amount, park_charge, corner_charge,
            remaining_sale_price_lump_sum, remaining_sale_price_installments, interest_amount, remaining_installment_date,
            area_square_meter, possession_date, additional_land_amount, restoration_charges,
            certificate_charges, registration_charges, registration_date_2,
            transfer_name, transferors_fathers_husbands_name, address, inheritance,
            transfer_fee, documentation_fee, transfer_date, building_plan_approval_date,
            building_construction, deposit_date, change_fee, advertisement_fee, owner_photo, document, land_price
          ) VALUES ( ?,?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
        const propertyValues = [
          formData.schemeName,
          formData.schemeId,
          formData.serialNumber,
          formData.propertyId,
          formData.allotteName,
          formData.fatherHusbandName,
          formData.permanentAddress,
          formData.currentAddress,
          formData.mobileNumber,
          formData.propertyCategory,
          formData.shopNumber,
          formData.propertyNumber,
          formData.registrationAmount,
          formData.registrationDate,
          formData.allotmentAmount,
          formData.allotmentDate,
          formData.salePrice,
          formData.eAuctionPrice,
          formData.freeholdAmount,
          formData.leaseRentAmount,
          formData.parkCharge,
          formData.cornerCharge,
          formData.remainingSalePriceLumpSum,
          formData.remainingSalePriceInstallment,
          formData.interestAmount,
          formData.remainingInstallmentDate,
          formData.areaSquareMeter,
          formData.possessionDate,
          formData.additionalLandAmount,
          formData.restorationCharges,
          formData.certificateCharges,
          formData.registrationCharges,
          formData.registrationDate2,
          formData.transferName,
          formData.transferorFatherHusbandName,
          formData.transferorAddress,
          formData.inheritance,
          formData.transferCharges,
          formData.documentationCharges,
          formData.transferDate,
          formData.buildingPlanApprovalDate,
          formData.buildingConstruction,
          formData.depositDateReceiptNumber,
          formData.changeFee,
          formData.advertisementFee,
          ownerPhotoPath,
          documentPath,
          formData.landPrice,
        ];
  
        pool.query(propertyQuery, propertyValues, (err, propertyResult) => {
          if (err) {
            console.error('Error inserting new_property data:', err);
            return res
              .status(500)
              .json({ message: 'Error inserting new_property data into the database', errorObj: err });
          }
  
          const propertyId = propertyResult.insertId; // ID of the inserted property
          console.log(propertyId);
          
  
          // Step 2: Insert data into the new_installment table
          const installmentQuery = `
            INSERT INTO new_installment (
              property_id, installment_payment_amount, installment_interest_amount, delayed_interest_amount, installment_date
            ) VALUES (?, ?, ?, ?, ?)`;
  
          const installmentPromises =
            Array.isArray(paymentHistory) &&
            paymentHistory.map((installment) => {
              const installmentValues = [
                propertyId,
                installment.installmentAmount,
                installment.installmentInterest,
                installment.delayedInterestAmount,
                installment.installmentDate,
              ];
  
              return new Promise((resolve, reject) => {
                pool.query(installmentQuery, installmentValues, (err, result) => {
                  if (err) {
                    console.error('Error inserting installment data:', err);
                    reject(err);
                  } else {
                    resolve(result);
                  }
                });
              });
            });
  
          // Step 3: Insert data into the new_service_charge table
          const serviceChargeQuery = `
            INSERT INTO new_service_charge (
              property_id, service_charge_financial_year, service_charge_amount, service_charges_late_fee, service_charges_date
            ) VALUES (?, ?, ?, ?, ?)`;
  
          const serviceChargePromises =
            Array.isArray(serviceChargeHistory) &&
            serviceChargeHistory.map((serviceCharge) => {
              const serviceChargeValues = [
                propertyId,
                serviceCharge.financialYear,
                serviceCharge.amount,
                serviceCharge.lateFee,
                serviceCharge.date,
              ];
  
              return new Promise((resolve, reject) => {
                pool.query(serviceChargeQuery, serviceChargeValues, (err, result) => {
                  if (err) {
                    console.error('Error inserting service charge data:', err);
                    reject(err);
                  } else {
                    resolve(result);
                  }
                });
              });
            });
  
          // Step 4: Combine all promises and send response
          Promise.all([...(installmentPromises || []), ...(serviceChargePromises || [])])
            .then(() => {
              res.status(200).json({
                message: 'Data inserted successfully',
                propertyData: formData,
                paymentHistory,
                serviceChargeHistory,
                ownerPhoto: ownerPhotoPath,
                document: documentPath,
              });
            })
            .catch((err) => {
              console.error('Error inserting data:', err);
              res.status(500).json({
                message: 'Error inserting data into the database',
                errorObj: err,
              });
            });
        });
      } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).json({
          message: 'Unexpected error occurred',
          errorObj: error,
        });
      }
    }
  );


  router.get('/', (req, res) => {
    const query = `
      WITH aggregated_installments AS (
        SELECT 
          property_id,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'installment_date', installment_date,
              'delayed_interest_amount', delayed_interest_amount,
              'installment_interest_amount', installment_interest_amount,
              'installment_payment_amount', installment_payment_amount
            )
          ) AS installments
        FROM 
          new_installment
        GROUP BY 
          property_id
      ),
      aggregated_service_charges AS (
        SELECT 
          property_id,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'service_charges_date', service_charges_date,
              'service_charges_late_fee', service_charges_late_fee,
              'service_charge_amount', service_charge_amount,
              'service_charge_financial_year', service_charge_financial_year
            )
          ) AS service_charges
        FROM 
          new_service_charge
        GROUP BY 
          property_id
      )
      SELECT 
        np.*,
        COALESCE(ai.installments, '[]') AS installments,
        COALESCE(asc_data.service_charges, '[]') AS service_charges
      FROM 
        new_property np
      LEFT JOIN 
        aggregated_installments ai ON np.id = ai.property_id
      LEFT JOIN 
        aggregated_service_charges asc_data ON np.id = asc_data.property_id;
    `;
  
    pool.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching data:', err);
        return res.status(500).send('Error fetching data from the database');
      }
  
      // Parse JSON strings into JavaScript arrays
      const formattedResults = results.map((row) => ({
        ...row,
        installments: JSON.parse(row.installments || '[]'),
        service_charges: JSON.parse(row.service_charges || '[]'),
      }));
  
      res.status(200).json({
        message: 'Data fetched successfully',
        data: formattedResults,
      });
    });
  });



  router.put('/:id', (req, res) => {
    const propertyId = req.params.id; // ID of the property to update
    const formData = req.body; // Form data from the frontend
    const paymentHistory = formData.paymentHistory || []; // Array of payment history
    const serviceChargeHistory = formData.serviceChargeHistory || []; // Array of service charges
  
    // Step 1: Update data in the new_property table
    const propertyQuery = `
      UPDATE new_property SET
        scheme_name = ?, scheme_id = ?, serial_number = ?, allottee_name = ?, fathers_husbands_name = ?,
        permanent_address = ?, current_address = ?, mobile_number = ?, property_category = ?, shop_number = ?, property_number = ?,
        registration_amount = ?, registration_date = ?, allotment_amount = ?, allotment_date = ?, sale_price = ?, e_auction_price = ?,
        freehold_amount = ?, lease_rent_amount = ?, park_charge = ?, corner_charge = ?,
        remaining_sale_price_lump_sum = ?, remaining_sale_price_installments = ?, interest_amount = ?, remaining_installment_date = ?,
        area_square_meter = ?, possession_date = ?, additional_land_amount = ?, restoration_charges = ?,
        certificate_charges = ?, registration_charges = ?, registration_date_2 = ?,
        transfer_name = ?, transferors_fathers_husbands_name = ?, address = ?, inheritance = ?,
        transfer_fee = ?, documentation_fee = ?, transfer_date = ?, building_plan_approval_date = ?,
        building_construction = ?, deposit_date = ?, change_fee = ?, advertisement_fee = ?, land_price = ?
      WHERE id = ?`;
  
    const propertyValues = [
      formData.schemeName, formData.schemeId, formData.serialNumber, formData.allotteName, formData.fatherHusbandName,
      formData.permanentAddress, formData.currentAddress, formData.mobileNumber, formData.propertyCategory, formData.shopNumber, formData.propertyNumber,
      formData.registrationAmount, formData.registrationDate, formData.allotmentAmount, formData.allotmentDate, formData.salePrice, formData.eAuctionPrice,
      formData.freeholdAmount, formData.leaseRentAmount, formData.parkCharge, formData.cornerCharge,
      formData.remainingSalePriceLumpSum, formData.remainingSalePriceInstallment, formData.interestAmount, formData.remainingInstallmentDate,
      formData.areaSquareMeter, formData.possessionDate, formData.additionalLandAmount, formData.restorationCharges,
      formData.certificateCharges, formData.registrationCharges, formData.registrationDate2,
      formData.transferName, formData.transferorFatherHusbandName, formData.transferorAddress, formData.inheritance,
      formData.transferCharges, formData.documentationCharges, formData.transferDate, formData.buildingPlanApprovalDate,
      formData.buildingConstruction, formData.depositDateReceiptNumber, formData.changeFee, formData.advertisementFee, formData.landPrice,
      propertyId
    ];
  
    pool.query(propertyQuery, propertyValues, (err, propertyResult) => {
      if (err) {
        console.error("Error updating new_property data:", err);
        return res.status(500).json({ message: "Error updating new_property data", errorObj: err });
      }
  
      // Step 2: Update data in the new_installment table
      const installmentPromises = paymentHistory.map((installment) => {
        const installmentQuery = `
          INSERT INTO new_installment (
            property_id, installment_payment_amount, installment_interest_amount, delayed_interest_amount, installment_date
          ) VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            installment_payment_amount = VALUES(installment_payment_amount),
            installment_interest_amount = VALUES(installment_interest_amount),
            delayed_interest_amount = VALUES(delayed_interest_amount),
            installment_date = VALUES(installment_date)`;
  
        const installmentValues = [
          propertyId,
          installment.installmentAmount,
          installment.installmentInterest,
          installment.delayedInterestAmount,
          installment.installmentDate,
        ];
  
        return new Promise((resolve, reject) => {
          pool.query(installmentQuery, installmentValues, (err, result) => {
            if (err) {
              console.error("Error updating new_installment data:", err);
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
      });
  
      // Step 3: Update data in the new_service_charge table
      const serviceChargePromises = serviceChargeHistory.map((serviceCharge) => {
        const serviceChargeQuery = `
          INSERT INTO new_service_charge (
            property_id, service_charge_financial_year, service_charge_amount, service_charges_late_fee, service_charges_date
          ) VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            service_charge_amount = VALUES(service_charge_amount),
            service_charges_late_fee = VALUES(service_charges_late_fee),
            service_charges_date = VALUES(service_charges_date)`;
  
        const serviceChargeValues = [
          propertyId,
          serviceCharge.financialYear,
          serviceCharge.amount,
          serviceCharge.lateFee,
          serviceCharge.date,
        ];
  
        return new Promise((resolve, reject) => {
          pool.query(serviceChargeQuery, serviceChargeValues, (err, result) => {
            if (err) {
              console.error("Error updating new_service_charge data:", err);
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
      });
  
      // Step 4: Combine all promises and send response
      Promise.all([...installmentPromises, ...serviceChargePromises])
        .then(() => {
          res.status(200).json({
            message: "Data updated successfully",
            propertyData: formData,
            paymentHistory,
            serviceChargeHistory,
          });
        })
        .catch((err) => {
          console.error("Error updating data:", err);
          res.status(500).json({ message: "Error updating new_property data", errorObj: err });
        });
    });
  });
  
  
  
  

module.exports = router
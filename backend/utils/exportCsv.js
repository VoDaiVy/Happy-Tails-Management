/**
 * CSV Export Utilities
 * Helpers for exporting data to CSV format
 */

const { Parser } = require('json2csv');

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of plain objects
 * @param {Array<{label: string, value: string|function}>} fields - CSV column definitions
 * @returns {string} CSV string
 */
const convertToCSV = (data, fields) => {
  const parser = new Parser({ fields, defaultValue: '' });
  return parser.parse(data);
};

/**
 * Send CSV as downloadable file response
 * @param {Object} res - Express response object
 * @param {string} csvString - CSV content
 * @param {string} filename - e.g. 'transactions-2026-03-07.csv'
 */
const sendCSVResponse = (res, csvString, filename) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  // BOM for Excel UTF-8 compatibility
  res.send('\uFEFF' + csvString);
};

/**
 * Transaction CSV field definitions
 */
const TRANSACTION_CSV_FIELDS = [
  { label: 'Transaction Code', value: 'transactionCode' },
  { label: 'User Name', value: 'userId.fullName' },
  { label: 'User Email', value: 'userId.email' },
  { label: 'Type', value: 'type' },
  { label: 'Method', value: 'method' },
  { label: 'Amount (VND)', value: 'amount' },
  { label: 'Balance Before', value: 'balanceBefore' },
  { label: 'Balance After', value: 'balanceAfter' },
  { label: 'Status', value: 'status' },
  { label: 'Note', value: 'note' },
  { label: 'Reference ID', value: 'referenceId' },
  { label: 'Failure Reason', value: 'failureReason' },
  { label: 'Created At', value: row => new Date(row.createdAt).toLocaleString('vi-VN') }
];

module.exports = {
  convertToCSV,
  sendCSVResponse,
  TRANSACTION_CSV_FIELDS
};

const db = require('../database/db');

exports.getCustomers = (req, res) => {
  try {
    const customers = db.prepare('SELECT * FROM customers ORDER BY id DESC').all();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
};

exports.createCustomer = (req, res) => {
  try {
    const { name, phone, email, address, total_purchases = 0 } = req.body;
    const result = db.prepare('INSERT INTO customers (name, phone, email, address, total_purchases) VALUES (?, ?, ?, ?, ?)').run(name, phone, email, address, total_purchases);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Customer created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create customer' });
  }
};

exports.updateCustomer = (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address } = req.body;
    db.prepare('UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?').run(name, phone, email, address, id);
    res.json({ message: 'Customer updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update customer' });
  }
};

exports.deleteCustomer = (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete customer' });
  }
};

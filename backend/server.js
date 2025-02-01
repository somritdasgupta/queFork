const express = require('express');
const cors = require('cors');

const app = express();
const port = 4000;
// Nothing just a basic middleware :)
app.use(cors());
app.use(express.json());

let users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, role: 'admin', address: '123 Main St' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, role: 'user', address: '456 Oak Ave' },
    { id: 3, name: 'Bob Wilson', email: 'bob@example.com', age: 35, role: 'user', address: '789 Pine Rd' }
];

let products = [
    { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics', stock: 50 },
    { id: 2, name: 'Smartphone', price: 599.99, category: 'Electronics', stock: 100 },
    { id: 3, name: 'Headphones', price: 99.99, category: 'Accessories', stock: 200 }
];

// User endpoints
// GET endpoint
app.get('/api/users', (req, res) => {
    res.json(users);
});

// GET endpoint with ID
app.get('/api/users/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
});

// POST endpoint
app.post('/api/users', (req, res) => {
    const newUser = {
        id: users.length + 1,
        name: req.body.name,
        email: req.body.email
    };
    users.push(newUser);
    res.status(201).json(newUser);
});

// Update user
app.put('/api/users/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    Object.assign(user, req.body);
    res.json(user);
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
    const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
    if (userIndex === -1) return res.status(404).json({ message: 'User not found' });
    
    users.splice(userIndex, 1);
    res.status(204).send();
});

// Search users
app.get('/api/users/search', (req, res) => {
    const { name, role } = req.query;
    let filtered = [...users];
    
    if (name) {
        filtered = filtered.filter(u => u.name.toLowerCase().includes(name.toLowerCase()));
    }
    if (role) {
        filtered = filtered.filter(u => u.role === role);
    }
    
    res.json(filtered);
});

// Product endpoints
app.get('/api/products', (req, res) => {
    res.json(products);
});

app.get('/api/products/:id', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
});

app.post('/api/products', (req, res) => {
    const newProduct = {
        id: products.length + 1,
        ...req.body
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

app.get('/api/products/category/:category', (req, res) => {
    const categoryProducts = products.filter(p => 
        p.category.toLowerCase() === req.params.category.toLowerCase()
    );
    res.json(categoryProducts);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

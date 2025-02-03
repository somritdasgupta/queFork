const express = require("express");
const cors = require("cors");

const app = express();
const port = 4000;
// Nothing just a basic middleware :)
app.use(cors());
app.use(express.json());

let users = [
  {
    id: 1,
    name: "Dinesh Raj",
    email: "dinesh@example.com",
    age: 30,
    role: "admin",
    address: "123 Main St",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    age: 25,
    role: "user",
    address: "456 Oak Ave",
  },
  {
    id: 3,
    name: "Bob Pushkar",
    email: "bob@example.com",
    age: 35,
    role: "user",
    address: "789 Pine Rd",
  },
  {
    id: 4,
    name: "Raj Patel",
    email: "raj@example.com",
    age: 28,
    role: "user",
    address: "321 Mumbai St",
  },
  {
    id: 5,
    name: "Priya Sharma",
    email: "priya@example.com",
    age: 32,
    role: "admin",
    address: "456 Delhi Rd",
  },
  {
    id: 6,
    name: "Amit Kumar",
    email: "amit@example.com",
    age: 27,
    role: "user",
    address: "789 Bangalore Ave",
  },
  {
    id: 7,
    name: "Neha Singh",
    email: "neha@example.com",
    age: 29,
    role: "user",
    address: "234 Chennai Lane",
  },
  {
    id: 8,
    name: "Vikram Mehta",
    email: "vikram@example.com",
    age: 31,
    role: "user",
    address: "567 Kolkata St",
  },
  {
    id: 9,
    name: "Deepa Gupta",
    email: "deepa@example.com",
    age: 26,
    role: "user",
    address: "890 Pune Rd",
  },
  {
    id: 10,
    name: "Arjun Reddy",
    email: "arjun@example.com",
    age: 33,
    role: "user",
    address: "432 Hyderabad Ave",
  },
  {
    id: 11,
    name: "Anita Desai",
    email: "anita@example.com",
    age: 30,
    role: "user",
    address: "765 Jaipur St",
  },
  {
    id: 12,
    name: "Suresh Kumar",
    email: "suresh@example.com",
    age: 34,
    role: "user",
    address: "543 Ahmedabad Rd",
  },
  {
    id: 13,
    name: "Maya Verma",
    email: "maya@example.com",
    age: 28,
    role: "user",
    address: "876 Lucknow Lane",
  },
];

let products = [
  { id: 1, name: "Laptop", price: 999.99, category: "Electronics", stock: 50 },
  {
    id: 2,
    name: "Smartphone",
    price: 599.99,
    category: "Electronics",
    stock: 100,
  },
  {
    id: 3,
    name: "Headphones",
    price: 99.99,
    category: "Accessories",
    stock: 200,
  },
  {
    id: 4,
    name: "Gaming Mouse",
    price: 79.99,
    category: "Accessories",
    stock: 150,
  },
  {
    id: 5,
    name: "Mechanical Keyboard",
    price: 129.99,
    category: "Accessories",
    stock: 75,
  },
  { id: 6, name: "Monitor", price: 299.99, category: "Electronics", stock: 30 },
  { id: 7, name: "Tablet", price: 449.99, category: "Electronics", stock: 60 },
  { id: 8, name: "Webcam", price: 69.99, category: "Accessories", stock: 100 },
  {
    id: 9,
    name: "Bluetooth Speaker",
    price: 89.99,
    category: "Electronics",
    stock: 80,
  },
  {
    id: 10,
    name: "USB-C Hub",
    price: 49.99,
    category: "Accessories",
    stock: 120,
  },
];

// User endpoints
// GET endpoint
app.get("/api/users", (req, res) => {
  res.json(users);
});

// GET endpoint with ID
app.get("/api/users/:id", (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

// POST endpoint
app.post("/api/users", (req, res) => {
  const newUser = {
    id: users.length + 1,
    name: req.body.name,
    email: req.body.email,
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

// Update user
app.put("/api/users/:id", (req, res) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ message: "User not found" });

  Object.assign(user, req.body);
  res.json(user);
});

// Delete user
app.delete("/api/users/:id", (req, res) => {
  const userIndex = users.findIndex((u) => u.id === parseInt(req.params.id));
  if (userIndex === -1)
    return res.status(404).json({ message: "User not found" });

  users.splice(userIndex, 1);
  res.status(204).send();
});

// Search users
app.get("/api/users/search", (req, res) => {
  const { name, role } = req.query;
  let filtered = [...users];

  if (name) {
    filtered = filtered.filter((u) =>
      u.name.toLowerCase().includes(name.toLowerCase())
    );
  }
  if (role) {
    filtered = filtered.filter((u) => u.role === role);
  }

  res.json(filtered);
});

// Product endpoints
app.get("/api/products", (req, res) => {
  res.json(products);
});

app.get("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

app.post("/api/products", (req, res) => {
  const newProduct = {
    id: products.length + 1,
    ...req.body,
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.get("/api/products/category/:category", (req, res) => {
  const categoryProducts = products.filter(
    (p) => p.category.toLowerCase() === req.params.category.toLowerCase()
  );
  res.json(categoryProducts);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

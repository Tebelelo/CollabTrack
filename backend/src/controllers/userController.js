import {
  addUser,
  getUsers,
  getUserByEmail,
  updateUser,
  deleteUser,
} from "../models/UserModel.js";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Register a new user
export const registerUser = async (req, res) => {
  try {
    const { username, email, first_name, last_name, password, user_role } = req.body;

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

      const user = await addUser(
        username,
        email,
        first_name,
        last_name,
        hashedPassword, 
        user_role
    );
    res.status(201).json(user);
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Failed to register user" });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await getUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// Get a single user by ID
export const getUser = async (req, res) => {
  try {
    const user = await getUserByEmail(req.params.email);
    if (!user)
      return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

// Update user
export const updateUserProfile = async (req, res) => {
  try {
    
    const user = await updateUser(req.params.id, req.body);
    if (!user)
      return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
};

// Delete user
export const removeUser = async (req, res) => {
  try {
    const user = await deleteUser(req.params.id);
    res
      .status(200)
      .json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

// Login user
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await getUserByEmail(email);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    // Compare password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, user_role: user.user_role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Don't send the password back to the client
    const { password: _, ...userInfo } = user;

    res.json({ message: "Login successful", user: userInfo, token });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Failed to log in" });
  }
};

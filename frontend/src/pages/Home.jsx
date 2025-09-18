import React from "react";
import { Link } from "react-router-dom";
import { api } from "../api/api.js";

export default function Home() {
  async function testBoards() {
    try {
      const { data } = await api.get("/api/boards/");
      alert("Boards: " + JSON.stringify(data));
    } catch (e) {
      alert("Error: " + (e?.response?.status || e.message));
    }
  }

  return (
    <div style={{padding:16}}>
      <h3>Home (ชั่วคราว)</h3>
      <p>
        <button onClick={testBoards}>ทดสอบเรียก /boards/ ด้วยโทเคน</button>
      </p>
      <p><Link to="/login">Login</Link> | <Link to="/register">Register</Link></p>
      <p><Link to="/boards">Go to Boards</Link></p>
    </div>
  );
}
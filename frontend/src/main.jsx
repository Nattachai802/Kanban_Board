import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Authen/login.jsx";
import Register from "./pages/Authen/Register.jsx";
import Home from "./pages/Home.jsx";
import BoardsList from "./pages/board/BoardsList.jsx";
import BoardDetail from "./pages/board/BoardDetail.jsx";
import BoardMembers from "./pages/board/BoardMembers.jsx";
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster position="bottom-center" />
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/boards" element={<BoardsList/>}/>
        <Route path="/register" element={<Register/>}/>
        <Route path="/boards/:boardId" element={<BoardDetail/>}/>
        <Route path="/boards/:boardId/members" element={<BoardMembers/>}/>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);



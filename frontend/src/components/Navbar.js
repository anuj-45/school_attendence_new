import React from "react";

const Navbar = ({ title, user }) => {
  return (
    <header className="navbar">
      <div>
        <h1>{title}</h1>
        <p>Manage daily attendance efficiently</p>
      </div>
      <div className="user-pill">
        <strong>{user?.name}</strong>
        <span>{user?.role}</span>
      </div>
    </header>
  );
};

export default Navbar;

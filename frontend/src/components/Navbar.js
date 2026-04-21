import React from "react";

const Navbar = ({ title, user }) => {
  return (
    <header className="navbar">
      <div>
        <h1>{title}</h1>
        <p>Manage daily attendance efficiently</p>
        {user?.schoolName && (
          <p className="school-info">
            {user.schoolName} • UDISE: {user.udiseCode || user.schoolCode}
          </p>
        )}
      </div>
      <div className="user-pill">
        <strong>{user?.name}</strong>
        <span>{user?.role}</span>
      </div>
    </header>
  );
};

export default Navbar;

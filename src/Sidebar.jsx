import React from 'react';

const Sidebar = ({ keyFigures, checkedState, onCheckboxChange }) => {
  return (
    <div className="sidebar">
      <h4>주요 인물</h4>
      <div className="key-figures-list">
        {keyFigures.map(figure => (
          <div key={figure.id} className="checkbox-container">
            <input
              type="checkbox"
              id={`figure-${figure.id}`}
              checked={checkedState[figure.id] || false}
              onChange={() => onCheckboxChange(figure.id)}
            />
            <label htmlFor={`figure-${figure.id}`}>{figure.name_hangeul}</label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;

import React from 'react';

const Sidebar = ({ keyFigures, checkedState, onCheckboxChange, degreeFilter, onDegreeChange }) => {
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
      <div className="sidebar-divider" />
      <div className="degree-filter">
        <label htmlFor="degree-slider">관계 깊이 (촌수): <strong>{degreeFilter}촌</strong></label>
        <input
          type="range"
          id="degree-slider"
          min="1"
          max="10"
          value={degreeFilter}
          onChange={(e) => onDegreeChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
};

export default Sidebar;
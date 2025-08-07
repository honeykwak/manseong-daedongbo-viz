import React, { useEffect, useRef } from 'react';

const Sidebar = ({ 
  keyFigures, 
  checkedState, 
  onCheckboxChange, 
  degreeFilter, 
  onDegreeChange, 
  edgeTypeFilter, 
  onEdgeTypeChange,
  onSelectAllKeyFigures 
}) => {
  const selectAllCheckboxRef = useRef();

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const totalCount = keyFigures.length;
      const checkedCount = Object.values(checkedState).filter(Boolean).length;
      
      if (checkedCount === 0) {
        selectAllCheckboxRef.current.checked = false;
        selectAllCheckboxRef.current.indeterminate = false;
      } else if (checkedCount === totalCount) {
        selectAllCheckboxRef.current.checked = true;
        selectAllCheckboxRef.current.indeterminate = false;
      } else {
        selectAllCheckboxRef.current.checked = false;
        selectAllCheckboxRef.current.indeterminate = true;
      }
    }
  }, [checkedState, keyFigures.length]);

  const handleSelectAllChange = (e) => {
    onSelectAllKeyFigures(e.target.checked);
  };

  return (
    <div className="sidebar">
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
      <div className="sidebar-divider" />
      <h4 style={{ borderBottom: 'none', paddingBottom: 0 }}>관계 유형</h4>
      <div className="edge-type-filter">
        <div className="checkbox-container">
          <input
            type="checkbox"
            id="parent-child-filter"
            checked={edgeTypeFilter.PARENT_CHILD}
            onChange={() => onEdgeTypeChange('PARENT_CHILD')}
          />
          <label htmlFor="parent-child-filter">부자 관계</label>
        </div>
        <div className="checkbox-container">
          <input
            type="checkbox"
            id="affiliation-filter"
            checked={edgeTypeFilter.POTENTIAL_AFFILIATION}
            onChange={() => onEdgeTypeChange('POTENTIAL_AFFILIATION')}
          />
          <label htmlFor="affiliation-filter">처부 관계</label>
        </div>
      </div>
      <div className="sidebar-divider" />
      <div className="key-figures-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div className="checkbox-container" style={{ marginBottom: 0 }}>
           <input
            type="checkbox"
            id="select-all-key-figures"
            ref={selectAllCheckboxRef}
            onChange={handleSelectAllChange}
            title="전체 선택/해제"
          />
        </div>
        <h4 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>주요 인물</h4>
      </div>
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

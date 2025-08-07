import React, { useState, useEffect, useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import Sidebar from './Sidebar';
import { keyFigureIds } from './keyFigureIds';
import './App.css';

function App() {
  // --- State Management ---
  const [allData, setAllData] = useState({ nodes: [], links: [], idMap: new Map() });
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [keyFigures, setKeyFigures] = useState([]);
  const [checkedState, setCheckedState] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const fgRef = useRef();

  // --- Data Loading and Initial Setup ---
  useEffect(() => {
    fetch('/jokbo_network.json')
      .then(res => res.json())
      .then(rawdata => {
        const idMap = new Map(rawdata.nodes.map(node => [node.id, node]));
        
        // Pre-calculate reciprocal relationships
        const affiliationLinks = new Set();
        rawdata.edges.forEach(edge => {
            if (edge.type === 'POTENTIAL_AFFILIATION') {
                affiliationLinks.add(`${edge.source}-${edge.target}`);
            }
        });

        const links = rawdata.edges.map(edge => {
          const isReciprocal = edge.type === 'POTENTIAL_AFFILIATION' 
            ? affiliationLinks.has(`${edge.target}-${edge.source}`) 
            : false;

          return {
            ...edge,
            source: idMap.get(edge.source),
            target: idMap.get(edge.target),
            isReciprocal: isReciprocal
          };
        });

        const figures = keyFigureIds.map(id => idMap.get(id)).filter(Boolean);
        setKeyFigures(figures);

        const initialCheckedState = {};
        keyFigureIds.forEach(id => { initialCheckedState[id] = true; });
        setCheckedState(initialCheckedState);
        
        setAllData({ nodes: rawdata.nodes, links, idMap });
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        setLoading(false);
      });
  }, []);

  // --- Graph Data Calculation based on Checkboxes ---
  useEffect(() => {
    if (loading || !allData.idMap.size) return;

    const nodesToShow = new Set();
    const linksToShow = new Set();
    const checkedIds = Object.keys(checkedState).filter(id => checkedState[id]);

    checkedIds.forEach(id => {
      const figureNode = allData.idMap.get(id);
      if (figureNode) {
        nodesToShow.add(figureNode);
        allData.links.forEach(link => {
          if (link.source.id === id) {
            nodesToShow.add(link.target);
            linksToShow.add(link);
          } else if (link.target.id === id) {
            nodesToShow.add(link.source);
            linksToShow.add(link);
          }
        });
      }
    });
    
    setGraphData({ nodes: Array.from(nodesToShow), links: Array.from(linksToShow) });

  }, [checkedState, allData, loading]);


  // --- Interaction Handlers ---
  const handleCheckboxChange = (figureId) => {
    setCheckedState(prevState => ({
      ...prevState,
      [figureId]: !prevState[figureId]
    }));
  };

  const handleNodeClick = useCallback(node => {
    setSelectedNode(node);
    fgRef.current.centerAt(node.x, node.y, 1000);
  }, [fgRef]);

  // --- Canvas Rendering ---
  const nodeCanvasObject = (node, ctx, globalScale) => {
    const label = `${node.name_hangeul}`;
    const fontSize = 12 / globalScale;
    ctx.font = `bold ${fontSize}px Sans-Serif`;

    const isKeyFigure = keyFigureIds.includes(node.id);
    const isSelected = selectedNode && node.id === selectedNode.id;

    ctx.fillStyle = isSelected ? 'red' : (isKeyFigure ? 'yellow' : 'orange');
    ctx.beginPath();
    ctx.arc(node.x, node.y, isKeyFigure ? 6 : 4, 0, 2 * Math.PI, false);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(label, node.x, node.y + 12);
  };

  // --- Render ---
  if (loading) {
    return <div className="loader">데이터 로딩 중...</div>;
  }

  return (
    <div className="app-container">
      <Sidebar 
        keyFigures={keyFigures}
        checkedState={checkedState}
        onCheckboxChange={handleCheckboxChange}
      />
      <div className="graph-container">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={(link, ctx) => {
            const isParentChild = link.type === 'PARENT_CHILD';
            ctx.lineWidth = 0.7;
            ctx.strokeStyle = isParentChild ? 'rgba(0, 150, 255, 0.6)' : 'rgba(255, 0, 0, 0.6)';
            
            if (link.type === 'POTENTIAL_AFFILIATION' && !link.isReciprocal) {
              ctx.setLineDash([2, 2]);
            } else {
              ctx.setLineDash([]);
            }

            ctx.beginPath();
            ctx.moveTo(link.source.x, link.source.y);
            ctx.lineTo(link.target.x, link.target.y);
            ctx.stroke();
          }}
          linkDirectionalParticles={link => link.type === 'PARENT_CHILD' ? 4 : 0}
          linkDirectionalParticleWidth={2.5}
          linkDirectionalParticleColor={() => 'cyan'}
          linkDirectionalParticleSpeed={0.008}
          onNodeClick={handleNodeClick}
          onBackgroundClick={() => setSelectedNode(null)}
          nodeRelSize={4}
        />
      </div>
      <div className={`info-panel ${!selectedNode ? 'hidden' : ''}`}>
        {selectedNode && (
          <>
            <h3>{selectedNode.name_hangeul}</h3>
            <p><strong>한자:</strong> {selectedNode.name_hanja || 'N/A'}</p>
            <p><strong>성관:</strong> {selectedNode.clan || 'N/A'}</p>
            <p><strong>계파:</strong> {selectedNode.gyePa || 'N/A'}</p>
            <p><strong>고유번호:</strong> {selectedNode.id}</p>
            <p><strong>비고:</strong> {selectedNode.remarks || 'N/A'}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
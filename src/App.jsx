import React, { useState, useEffect, useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceX, forceY } from 'd3-force';
import Sidebar from './Sidebar';
import { keyFigureIds } from './keyFigureIds';
import './App.css';

// --- Helper: BFS for degree-based filtering ---
const filterGraphByDegree = (allNodes, allLinks, startNodeIds, degree) => {
  if (startNodeIds.length === 0) return { nodes: [], links: [] };

  const adj = new Map();
  allNodes.forEach(node => adj.set(node.id, []));
  allLinks.forEach(link => {
    adj.get(link.source.id).push(link.target);
    adj.get(link.target.id).push(link.source);
  });

  const nodesToShow = new Set();
  const linksToShow = new Set();
  const q = [];
  const distances = new Map();

  startNodeIds.forEach(id => {
    const startNode = allNodes.find(n => n.id === id);
    if (startNode) {
      q.push(startNode);
      distances.set(startNode.id, 0);
      nodesToShow.add(startNode);
    }
  });

  let head = 0;
  while(head < q.length) {
    const u = q[head++];
    const dist = distances.get(u.id);

    if (dist >= degree) continue;

    adj.get(u.id)?.forEach(v => {
      if (!distances.has(v.id)) {
        distances.set(v.id, dist + 1);
        nodesToShow.add(v);
        q.push(v);
      }
    });
  }
  
  allLinks.forEach(link => {
    if (nodesToShow.has(link.source) && nodesToShow.has(link.target)) {
      linksToShow.add(link);
    }
  });

  return { nodes: Array.from(nodesToShow), links: Array.from(linksToShow) };
};


function App() {
  // --- State Management ---
  const [allData, setAllData] = useState({ nodes: [], links: [], idMap: new Map(), clusters: new Map(), clusterCount: 0 });
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [keyFigures, setKeyFigures] = useState([]);
  const [checkedState, setCheckedState] = useState({});
  const [degreeFilter, setDegreeFilter] = useState(1); // New state for degree
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const fgRef = useRef();

  // --- Data Loading and Pre-processing ---
  useEffect(() => {
    fetch('/jokbo_network.json')
      .then(res => res.json())
      .then(rawdata => {
        const idMap = new Map(rawdata.nodes.map(node => [node.id, node]));
        const links = rawdata.edges.map(edge => ({ ...edge, source: idMap.get(edge.source), target: idMap.get(edge.target) }));
        
        const { clusters, clusterCount } = findClusters(rawdata.nodes, links);
        rawdata.nodes.forEach(node => node.cluster = clusters.get(node.id));

        const affiliationLinks = new Set();
        links.forEach(edge => { if (edge.type === 'POTENTIAL_AFFILIATION') affiliationLinks.add(`${edge.source.id}-${edge.target.id}`); });
        links.forEach(link => { link.isReciprocal = link.type === 'POTENTIAL_AFFILIATION' ? affiliationLinks.has(`${link.target.id}-${link.source.id}`) : false; });

        const figures = keyFigureIds.map(id => idMap.get(id)).filter(Boolean);
        setKeyFigures(figures);
        const initialCheckedState = {};
        keyFigureIds.forEach(id => { initialCheckedState[id] = true; });
        setCheckedState(initialCheckedState);
        
        setAllData({ nodes: rawdata.nodes, links, idMap, clusters, clusterCount });
        setLoading(false);
      });
  }, []);

  // --- Graph Data Calculation ---
  useEffect(() => {
    if (loading || !allData.idMap.size) return;
    
    const activeKeyNodeIds = Object.keys(checkedState).filter(id => checkedState[id]);
    const filteredData = filterGraphByDegree(allData.nodes, allData.links, activeKeyNodeIds, degreeFilter);
    
    setGraphData(filteredData);

  }, [checkedState, degreeFilter, allData, loading]);

  // --- Physics Engine Configuration ---
  useEffect(() => {
    if (loading || !fgRef.current) return;
    const simulation = fgRef.current.d3Force();
    if (!simulation) return;

    const clusterPositions = {};
    const angleStep = 2 * Math.PI / allData.clusterCount;
    const radius = 400;
    for (let i = 0; i < allData.clusterCount; i++) {
        clusterPositions[i] = { x: radius * Math.cos(angleStep * i), y: radius * Math.sin(angleStep * i) };
    }

    simulation.force('center', null);
    simulation.force('x', forceX(node => clusterPositions[node.cluster]?.x || 0).strength(0.05));
    simulation.force('y', forceY(node => clusterPositions[node.cluster]?.y || 0).strength(0.05));
    simulation.force('link').strength(link => link.type === 'PARENT_CHILD' ? 0.5 : 0.1);

  }, [loading, allData.clusterCount]);

  // --- (Rest of the component) ---
  const handleCheckboxChange = (figureId) => setCheckedState(p => ({...p, [figureId]: !p[figureId]}));
  const handleDegreeChange = (newDegree) => setDegreeFilter(newDegree);
  const handleNodeClick = useCallback(node => { setSelectedNode(node); fgRef.current.centerAt(node.x, node.y, 1000); }, [fgRef]);
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

  if (loading) return <div className="loader">데이터 로딩 중...</div>;

  return (
    <div className="app-container">
      <Sidebar 
        keyFigures={keyFigures} 
        checkedState={checkedState} 
        onCheckboxChange={handleCheckboxChange}
        degreeFilter={degreeFilter}
        onDegreeChange={handleDegreeChange}
      />
      <div className="graph-container">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={(link, ctx) => {
            ctx.lineWidth = 0.7;
            ctx.strokeStyle = link.type === 'PARENT_CHILD' ? 'rgba(0, 150, 255, 0.6)' : 'rgba(255, 0, 0, 0.6)';
            if (link.type === 'POTENTIAL_AFFILIATION' && !link.isReciprocal) ctx.setLineDash([2, 2]);
            else ctx.setLineDash([]);
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

// Re-add findClusters helper function that was inside the previous App component
const findClusters = (nodes, links) => {
  const adj = new Map();
  nodes.forEach(node => adj.set(node.id, []));
  links.forEach(link => {
    adj.get(link.source.id).push(link.target.id);
    adj.get(link.target.id).push(link.source.id);
  });

  const visited = new Set();
  const clusters = new Map();
  let clusterId = 0;

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const component = [];
      const q = [node.id];
      visited.add(node.id);
      
      while (q.length > 0) {
        const u = q.shift();
        component.push(u);
        adj.get(u).forEach(v => {
          if (!visited.has(v)) {
            visited.add(v);
            q.push(v);
          }
        });
      }
      
      component.forEach(nodeId => clusters.set(nodeId, clusterId));
      clusterId++;
    }
  });
  return { clusters, clusterCount: clusterId };
};

export default App;
import React, { useRef, useEffect, useState } from 'react';

const AMRWarehouseMap = () => {
  const canvasRef = useRef(null);
  const [mapData, setMapData] = useState(null);
  const [securityConfig, setSecurityConfig] = useState(null);
  const [robotPosition, setRobotPosition] = useState({ x: 49043, y: 74172, angle: 0 });
  const [selectedAvoidanceMode, setSelectedAvoidanceMode] = useState(1);
  const [scale, setScale] = useState(0.008); // Scale để fit map 100000x100000 vào canvas
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [showNodes, setShowNodes] = useState(true);
  const [showPaths, setShowPaths] = useState(true);
  const [showChargeStations, setShowChargeStations] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapFileName, setMapFileName] = useState('');
  const [securityFileName, setSecurityFileName] = useState('');

  // File input refs
  const mapFileInputRef = useRef(null);
  const securityFileInputRef = useRef(null);

  // Load sample data initially
  useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = () => {
    // Sample data để demo khi chưa load file
    const sampleMapData = {
      "nodeKeys": ["x", "y", "type", "content", "name", "isTurn", "shelfIsTurn", "extraTypes"],
      "lineKeys": ["from", "to", "leftWidth", "rightWidth", "startExpandDistance", "endExpandDistance", "path"],
      "nodeArr": [[9775,88064,0,"10000007","10000007",0,1,[]],[88127,88064,0,"10000008","10000008",0,1,[]],[88127,72690,6,"10000009","10000009",0,1,[0]],[49043,74172,0,"10000010","10000010",0,1,[]],[49043,24345,0,"10000011","10000011",0,1,[]],[63491,24345,0,"10000012","10000012",0,1,[]],[63491,8045,6,"10000013","10000013",0,1,[0]],[6070,8045,0,"10000014","10000014",0,1,[]]],
      "lineArr": [["10000007","10000044",-1,-1,-1,-1,[[9775,88064],[12302,88064]]],["10000008","10000015",-1,-1,-1,-1,[[88127,88064],[85599,88064]]],["10000009","10000054",-1,-1,-1,-1,[[88127,72690],[88127,74087]]],["10000010","10000064",-1,-1,-1,-1,[[49043,74172],[52596,74037]]]],
      "chargeCoor": [["10000009",{"x":0,"y":0}],["10000013",{"x":0,"y":0}]],
      "type": "topo",
      "height": 100000,
      "width": 100000
    };

    const sampleSecurityConfig = {
      "AvoidSceneSet": [
        {"id": 0, "name": "最小避障", "config": {"noload": {"forward": 200, "rotate": 50, "right": 50, "left": 50}}},
        {"id": 1, "name": "常规避障", "config": {"noload": {"forward": 500, "rotate": 100, "right": 80, "left": 80}}},
        {"id": 2, "name": "常规短避障", "config": {"noload": {"forward": 300, "rotate": 100, "right": 80, "left": 80}}},
        {"id": 3, "name": "进货架", "config": {"noload": {"forward": 300, "rotate": 50, "right": 20, "left": 20}}},
        {"id": 8, "name": "充电对接", "config": {"noload": {"forward": 200, "rotate": 50, "right": 10, "left": 10}}}
      ]
    };

    setMapData(sampleMapData);
    setSecurityConfig(sampleSecurityConfig);
    setMapFileName('Sample Map Data');
    setSecurityFileName('Sample Security Config');
  };

  const handleFileImport = (file, type) => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        
        if (type === 'map') {
          // Validate map data structure
          if (!jsonData.nodeKeys || !jsonData.lineKeys || !jsonData.nodeArr) {
            throw new Error('Invalid map file format. Missing required fields: nodeKeys, lineKeys, or nodeArr');
          }
          setMapData(jsonData);
          setMapFileName(file.name);
          
          // Auto-fit map when new data is loaded
          setScale(0.008);
          setOffset({ x: 0, y: 0 });
          
        } else if (type === 'security') {
          // Validate security config structure
          if (!jsonData.AvoidSceneSet) {
            throw new Error('Invalid security file format. Missing AvoidSceneSet field');
          }
          setSecurityConfig(jsonData);
          setSecurityFileName(file.name);
          
          // Reset to first avoidance mode
          if (jsonData.AvoidSceneSet.length > 0) {
            setSelectedAvoidanceMode(jsonData.AvoidSceneSet[0].id);
          }
        }
        
      } catch (error) {
        setError(`Error parsing ${type} file: ${error.message}`);
        console.error('File parsing error:', error);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError(`Error reading ${type} file`);
      setLoading(false);
    };

    reader.readAsText(file);
  };

  const handleMapFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileImport(file, 'map');
    }
  };

  const handleSecurityFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileImport(file, 'security');
    }
  };

  const resetToSampleData = () => {
    loadSampleData();
    setError(null);
    // Clear file inputs
    if (mapFileInputRef.current) mapFileInputRef.current.value = '';
    if (securityFileInputRef.current) securityFileInputRef.current.value = '';
  };

  // Parse nodes từ nodeArr
  const parseNodes = (nodeArr, nodeKeys) => {
    return nodeArr.map(nodeData => {
      const node = {};
      nodeKeys.forEach((key, index) => {
        node[key] = nodeData[index];
      });
      return node;
    });
  };

  // Parse lines từ lineArr  
  const parseLines = (lineArr, lineKeys) => {
    return lineArr.map(lineData => {
      const line = {};
      lineKeys.forEach((key, index) => {
        line[key] = lineData[index];
      });
      return line;
    });
  };

  // Simulate robot movement
  useEffect(() => {
    const interval = setInterval(() => {
      setRobotPosition(prev => ({
        x: prev.x + (Math.random() - 0.5) * 1000,
        y: prev.y + (Math.random() - 0.5) * 1000,
        angle: prev.angle + (Math.random() - 0.5) * 0.1
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const drawMap = (ctx, data, security) => {
    if (!data) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Apply transformations
    ctx.save();
    ctx.translate(offset.x + ctx.canvas.width/2, offset.y + ctx.canvas.height/2);
    ctx.scale(scale, scale);
    ctx.translate(-data.width/2, -data.height/2);

    // Draw grid
    drawGrid(ctx, data);
    
    // Draw paths first (background)
    if (showPaths) {
      drawPaths(ctx, data);
    }
    
    // Draw nodes
    if (showNodes) {
      drawNodes(ctx, data);
    }
    
    // Draw charge stations
    if (showChargeStations) {
      drawChargeStations(ctx, data);
    }
    
    // Draw robot
    drawRobot(ctx, robotPosition, security);
    
    ctx.restore();
  };

  const drawGrid = (ctx, data) => {
    const gridSize = 10000; // Grid every 10000 units
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 100;
    
    // Vertical lines
    for (let x = 0; x <= data.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, data.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= data.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(data.width, y);
      ctx.stroke();
    }
  };

  const drawPaths = (ctx, data) => {
    const lines = parseLines(data.lineArr, data.lineKeys);
    
    ctx.strokeStyle = '#74b9ff';
    ctx.lineWidth = 300;
    ctx.setLineDash([1000, 500]);
    
    lines.forEach(line => {
      if (line.path && line.path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(line.path[0][0], line.path[0][1]);
        
        for (let i = 1; i < line.path.length; i++) {
          ctx.lineTo(line.path[i][0], line.path[i][1]);
        }
        ctx.stroke();
      }
    });
    
    ctx.setLineDash([]);
  };

  const drawNodes = (ctx, data) => {
    const nodes = parseNodes(data.nodeArr, data.nodeKeys);
    
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 800, 0, 2 * Math.PI);
      
      // Color based on type
      switch (node.type) {
        case 0: // Regular waypoint
          ctx.fillStyle = '#00b894';
          break;
        case 6: // Special node (charge station)
          ctx.fillStyle = '#e17055';
          break;
        default:
          ctx.fillStyle = '#636e72';
      }
      
      ctx.fill();
      ctx.strokeStyle = '#2d3436';
      ctx.lineWidth = 200;
      ctx.stroke();
      
      // Draw node ID
      ctx.fillStyle = '#2d3436';
      ctx.font = '1000px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(node.name.slice(-3), node.x, node.y - 1500);
    });
  };

  const drawChargeStations = (ctx, data) => {
    if (!data.chargeCoor) return;
    
    const nodes = parseNodes(data.nodeArr, data.nodeKeys);
    const nodeMap = {};
    nodes.forEach(node => {
      nodeMap[node.name] = node;
    });

    data.chargeCoor.forEach(([nodeId, offset]) => {
      const node = nodeMap[nodeId];
      if (node) {
        // Draw charging symbol
        ctx.fillStyle = '#ffeaa7';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1200, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw lightning bolt
        ctx.fillStyle = '#fdcb6e';
        ctx.font = '2000px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚡', node.x, node.y + 600);
      }
    });
  };

  const drawRobot = (ctx, robot, security) => {
    ctx.save();
    ctx.translate(robot.x, robot.y);
    ctx.rotate(robot.angle);
    
    // Get current avoidance config
    const currentConfig = security?.AvoidSceneSet?.find(scene => scene.id === selectedAvoidanceMode);
    const avoidanceRadius = currentConfig?.config?.noload?.forward || 500;
    
    // Draw avoidance zone
    ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
    ctx.fillStyle = 'rgba(255, 107, 107, 0.1)';
    ctx.lineWidth = 200;
    ctx.beginPath();
    ctx.arc(0, 0, avoidanceRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Robot body
    ctx.fillStyle = '#0984e3';
    ctx.fillRect(-1500, -1000, 3000, 2000);
    
    // Robot direction arrow
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(1200, 0);
    ctx.lineTo(800, -600);
    ctx.lineTo(800, 600);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
    
    // Position text
    ctx.fillStyle = '#2d3436';
    ctx.font = '1000px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`(${Math.round(robot.x/1000)}k, ${Math.round(robot.y/1000)}k)`, robot.x, robot.y - 3000);
    
    // Current mode text
    if (currentConfig) {
      ctx.fillStyle = '#e17055';
      ctx.fillText(currentConfig.name, robot.x, robot.y + 4000);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mapData) return;
    
    const ctx = canvas.getContext('2d');
    drawMap(ctx, mapData, securityConfig);
  }, [mapData, securityConfig, robotPosition, scale, offset, showNodes, showPaths, showChargeStations, selectedAvoidanceMode]);

  const handleZoom = (direction) => {
    setScale(prev => {
      const newScale = direction > 0 ? prev * 1.2 : prev / 1.2;
      return Math.max(0.001, Math.min(0.05, newScale));
    });
  };

  const handleReset = () => {
    setScale(0.008);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-gray-50 rounded-lg shadow-lg">
      <div className="mb-4 flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-800">AMR Warehouse Navigation Map</h2>
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={() => handleZoom(1)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Zoom In
          </button>
          <button 
            onClick={() => handleZoom(-1)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Zoom Out
          </button>
          <button 
            onClick={handleReset}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reset
          </button>
        </div>
      </div>

      {/* File Import Section */}
      <div className="mb-4 p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Import Map Files</h3>
        
        {loading && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-700">Loading file...</span>
          </div>
        )}
        
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
            <span className="text-red-700">{error}</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Map File Import */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Map Data (compress.json)
            </label>
            <input
              ref={mapFileInputRef}
              type="file"
              accept=".json"
              onChange={handleMapFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {mapFileName && (
              <p className="text-xs text-green-600">✓ {mapFileName}</p>
            )}
          </div>

          {/* Security File Import */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Security Config (security.json)
            </label>
            <input
              ref={securityFileInputRef}
              type="file"
              accept=".json"
              onChange={handleSecurityFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            {securityFileName && (
              <p className="text-xs text-green-600">✓ {securityFileName}</p>
            )}
          </div>

          {/* Reset Button */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Actions
            </label>
            <button
              onClick={resetToSampleData}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              Reset to Sample Data
            </button>
          </div>
        </div>

        {/* File Format Help */}
        <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600">
          <p><strong>Expected file formats:</strong></p>
          <p><strong>Map file:</strong> JSON with nodeKeys, lineKeys, nodeArr, lineArr fields</p>
          <p><strong>Security file:</strong> JSON with AvoidSceneSet field containing avoidance configurations</p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showNodes"
            checked={showNodes}
            onChange={(e) => setShowNodes(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="showNodes" className="text-sm">Show Waypoints</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showPaths"
            checked={showPaths}
            onChange={(e) => setShowPaths(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="showPaths" className="text-sm">Show Paths</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showChargeStations"
            checked={showChargeStations}
            onChange={(e) => setShowChargeStations(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="showChargeStations" className="text-sm">Show Charge Stations</label>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="avoidanceMode" className="text-sm">Avoidance Mode:</label>
          <select
            id="avoidanceMode"
            value={selectedAvoidanceMode}
            onChange={(e) => setSelectedAvoidanceMode(parseInt(e.target.value))}
            className="text-sm border rounded px-2 py-1"
          >
            {securityConfig?.AvoidSceneSet?.map(scene => (
              <option key={scene.id} value={scene.id}>{scene.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1000}
          height={600}
          className="block w-full h-auto bg-white cursor-move"
          onMouseDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const startX = e.clientX - rect.left - offset.x;
            const startY = e.clientY - rect.top - offset.y;
            
            const handleMouseMove = (e) => {
              setOffset({
                x: e.clientX - rect.left - startX,
                y: e.clientY - rect.top - startY
              });
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
      </div>
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span>Regular Waypoint</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span>Special Node</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
          <span>Charge Station</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>AMR Robot</span>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 bg-white rounded border">
          <h3 className="font-semibold mb-2">Robot Status</h3>
          <p>Position: ({Math.round(robotPosition.x/1000)}k, {Math.round(robotPosition.y/1000)}k)</p>
          <p>Orientation: {(robotPosition.angle * 180 / Math.PI).toFixed(1)}°</p>
          <p>Scale: {(scale * 1000).toFixed(2)}‰</p>
        </div>
        
        <div className="p-3 bg-white rounded border">
          <h3 className="font-semibold mb-2">Current Files</h3>
          <p className="text-sm"><strong>Map:</strong> {mapFileName || 'No file loaded'}</p>
          <p className="text-sm"><strong>Security:</strong> {securityFileName || 'No file loaded'}</p>
          <p className="text-sm"><strong>Status:</strong> {loading ? 'Loading...' : 'Ready'}</p>
        </div>
      </div>
    </div>
  );
};

export default AMRWarehouseMap;
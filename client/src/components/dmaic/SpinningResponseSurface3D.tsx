import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface SpinningResponseSurface3DProps {
  xAxisLabel: string;
  yAxisLabel: string;
  zAxisLabel: string;
  xRange: [number, number];
  yRange: [number, number];
  predictFn: (x: number, y: number) => number;
  dataPoints?: Array<{ x: number; y: number; z: number; isCenter?: boolean; isSolution?: boolean }>;
  height?: number;
}

export default function SpinningResponseSurface3D({
  xAxisLabel,
  yAxisLabel,
  zAxisLabel,
  xRange,
  yRange,
  predictFn,
  dataPoints = [],
  height = 450,
}: SpinningResponseSurface3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(4, 4, 4);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const resolution = 40;
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const scaleXY = 1.5;
    
    let minZ = Infinity;
    let maxZ = -Infinity;
    const zValues: number[] = [];
    
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const tX = i / resolution;
        const tY = j / resolution;
        const xVal = xRange[0] + tX * (xRange[1] - xRange[0]);
        const yVal = yRange[0] + tY * (yRange[1] - yRange[0]);
        const zVal = predictFn(xVal, yVal);
        zValues.push(zVal);
        if (zVal < minZ) minZ = zVal;
        if (zVal > maxZ) maxZ = zVal;
      }
    }

    const zMid = (minZ + maxZ) / 2;
    const zScale = maxZ > minZ ? 1.5 / (maxZ - minZ) : 1;

    let idx = 0;
    for (let i = 0; i <= resolution; i++) {
      for (let j = 0; j <= resolution; j++) {
        const tX = -1 + (2 * i / resolution);
        const tY = -1 + (2 * j / resolution);
        const zVal = zValues[idx];
        
        vertices.push(tX * scaleXY, (zVal - zMid) * zScale, tY * scaleXY);

        const normalized = maxZ > minZ ? (zVal - minZ) / (maxZ - minZ) : 0.5;
        const color = new THREE.Color();
        color.setHSL(0.6 * normalized, 0.8, 0.5);
        colors.push(color.r, color.g, color.b);
        idx++;
      }
    }

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const a = i * (resolution + 1) + j;
        const b = a + resolution + 1;
        const c = a + 1;
        const d = b + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 30,
      transparent: true,
      opacity: 0.9
    });

    const surface = new THREE.Mesh(geometry, material);
    scene.add(surface);

    const pointsGroup = new THREE.Group();
    dataPoints.forEach(point => {
      const tX = (point.x - xRange[0]) / (xRange[1] - xRange[0]);
      const tY = (point.y - yRange[0]) / (yRange[1] - yRange[0]);
      const x3D = (-1 + 2 * tX) * scaleXY;
      const z3D = (-1 + 2 * tY) * scaleXY;
      const y3D = (point.z - zMid) * zScale;

      const sphereGeom = new THREE.SphereGeometry(0.08, 16, 16);
      let sphereColor = 0x3b82f6;
      if (point.isSolution) {
        sphereColor = 0xff0000;
      } else if (point.isCenter) {
        sphereColor = 0x22c55e;
      }
      const sphereMat = new THREE.MeshPhongMaterial({ color: sphereColor });
      const sphere = new THREE.Mesh(sphereGeom, sphereMat);
      sphere.position.set(x3D, y3D, z3D);
      pointsGroup.add(sphere);

      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x3D, -0.8, z3D),
        new THREE.Vector3(x3D, y3D, z3D)
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x999999 });
      const line = new THREE.Line(lineGeom, lineMat);
      pointsGroup.add(line);
    });
    scene.add(pointsGroup);

    const axesGroup = new THREE.Group();
    const axisLength = 2.0;
    const axesMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });

    const xGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-axisLength, -0.8, 0),
      new THREE.Vector3(axisLength, -0.8, 0)
    ]);
    axesGroup.add(new THREE.Line(xGeom, axesMaterial));

    const yGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.8, 0),
      new THREE.Vector3(0, 1.0, 0)
    ]);
    axesGroup.add(new THREE.Line(yGeom, axesMaterial));

    const zGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -0.8, -axisLength),
      new THREE.Vector3(0, -0.8, axisLength)
    ]);
    axesGroup.add(new THREE.Line(zGeom, axesMaterial));

    const createLabel = (text: string, position: THREE.Vector3) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;
      canvas.width = 256;
      canvas.height = 128;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#1f2937';
      context.font = 'Bold 32px Arial';
      context.textAlign = 'center';
      context.fillText(text.length > 12 ? text.substring(0, 12) + '...' : text, 128, 80);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.copy(position);
      sprite.scale.set(0.6, 0.3, 1);
      return sprite;
    };

    const xLabel = createLabel(xAxisLabel, new THREE.Vector3(2.3, -0.8, 0));
    const yLabel = createLabel(zAxisLabel, new THREE.Vector3(0, 1.3, 0));
    const zLabel = createLabel(yAxisLabel, new THREE.Vector3(0, -0.8, 2.3));
    if (xLabel) axesGroup.add(xLabel);
    if (yLabel) axesGroup.add(yLabel);
    if (zLabel) axesGroup.add(zLabel);

    scene.add(axesGroup);

    const gridHelper = new THREE.GridHelper(3, 10, 0xcccccc, 0xeeeeee);
    gridHelper.position.y = -0.8;
    scene.add(gridHelper);

    let angle = 0;
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      angle += 0.005;
      camera.position.x = 4 * Math.cos(angle);
      camera.position.z = 4 * Math.sin(angle);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (mountRef.current && cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mountRef.current && rendererRef.current?.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      surface.geometry.dispose();
      (surface.material as THREE.Material).dispose();
      pointsGroup.traverse(child => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) ((child as THREE.Mesh).material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, [xAxisLabel, yAxisLabel, zAxisLabel, xRange, yRange, predictFn, dataPoints]);

  return (
    <div className="w-full">
      <div 
        ref={mountRef} 
        className="w-full rounded-lg overflow-hidden bg-gray-50"
        style={{ height: `${height}px` }}
        data-testid="spinning-response-surface-3d"
      />
      <div className="flex gap-4 text-xs mt-2 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Data Points</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Center Points</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Solution</span>
        </div>
      </div>
    </div>
  );
}

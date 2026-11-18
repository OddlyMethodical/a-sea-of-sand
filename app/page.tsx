'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Layers, Maximize, Mountain, Pause, Play, RotateCcw, Plane, CircleDot, Download } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { registerModelTools } from './model-tools';
import { createTerrain, drawGrain } from './terrain';
import { GRID_SIZE, GRID_SIZES, SAND_PERCENTAGES, FIELD_SIZE } from './sediment';
import { makeState, advanceSimulation, resetSimulation, windAt, MAX_SIMULATION_SPEED, DETAILED_SPEED_LIMIT, type SimState } from './wind';

const scalar=(v:number|readonly number[])=>Array.isArray(v)?v[0]:v as number;
export default function Home(){
 const state=useRef<SimState>(makeState());const terrainRef=useRef<HTMLCanvasElement>(null);const grainRef=useRef<HTMLCanvasElement>(null);
 const [view,setView]=useState('aerial');const [playing,setPlaying]=useState(true);const [speed,setSpeed]=useState(5);const [strength,setStrength]=useState(1);const [altitude,setAltitude]=useState(260);const [cycles,setCycles]=useState(0);const [info,setInfo]=useState(false);const [error,setError]=useState('');
 const [fieldStats,setFieldStats]=useState({maxHeight:0,bareFraction:0,exported:0,initial:1,volume:0,balanceError:0,cycles:0});
 const [actualRate,setActualRate]=useState(0);
 const [direction,setDirection]=useState(60);const [variableWind,setVariableWind]=useState(false);const [wind,setWind]=useState({direction:60,strength:1});
 const [grid,setGrid]=useState(GRID_SIZE),[sand,setSand]=useState(100);
 const speedEntry=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(speedEntry.current)speedEntry.current.value=String(speed);},[speed,view]);
 const drag=useRef<{x:number,yaw:number}|null>(null);
 useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){state.current.playing=false;setPlaying(false);}return createTerrain(terrainRef.current!,state.current,setError);},[]);
 useEffect(()=>{
  let frame=0,prev=0,lastUI=0,shownCycles=-1,shownVersion=-1,shownDirection=NaN,shownStrength=NaN,rateStart=0,rateCycles=0,shownRate=0;
  function tick(now:number){
   const s=state.current,dt=prev?Math.min((now-prev)/1000,.08):0;prev=now;
   if(!document.hidden){
    advanceSimulation(s,dt);
    if(now-lastUI>120){
     if(s.cycles!==shownCycles||(s.model&&s.model.version!==shownVersion)){setCycles(s.cycles);shownCycles=s.cycles;}
     const w=windAt(s);if(w.direction!==shownDirection||w.strength!==shownStrength){setWind(w);shownDirection=w.direction;shownStrength=w.strength;}
     if(s.model&&s.model.version!==shownVersion){setFieldStats(s.model.stats());shownVersion=s.model.version;}
     lastUI=now;
    }
    if(s.view==='grain'&&grainRef.current)drawGrain(grainRef.current,s.grainTime);
   }
   if(!s.playing||s.view==='grain'||document.hidden){
    rateStart=now;rateCycles=s.cycles;if(shownRate!==0){setActualRate(0);shownRate=0;}
   }else if(!rateStart||s.cycles<rateCycles){rateStart=now;rateCycles=s.cycles;}
   else if(now-rateStart>=750){
    const rate=Math.round((s.cycles-rateCycles)*10000/(now-rateStart))/10;
    if(rate!==shownRate){setActualRate(rate);shownRate=rate;}rateStart=now;rateCycles=s.cycles;
   }
   frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[]);

 function toggle(){state.current.playing=!state.current.playing;setPlaying(state.current.playing);}
 function reset(resolution?:number,sandPercent?:number){resetSimulation(state.current,resolution,sandPercent);setCycles(0);setActualRate(0);setWind(windAt(state.current));if(state.current.model)setFieldStats(state.current.model.stats());}
 function changeView(v:unknown){const next=String(v);state.current.view=next;setView(next);}
 useEffect(()=>{const listener=(e:KeyboardEvent)=>{const el=e.target as HTMLElement;if(e.code==='Space'&&el.tagName!=='BUTTON'&&el.tagName!=='INPUT'&&el.tagName!=='SELECT'&&el.getAttribute('role')!=='slider'&&!el.closest('[role="dialog"]')){e.preventDefault();toggle();}};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);},[]);
 useEffect(()=>registerModelTools(()=>state.current,input=>{
  const model=state.current.model;
  const size=input.resolution??model?.size??GRID_SIZE,amount=input.sandPercent??model?.sandPercent??100;
  if(size!==(model?.size??GRID_SIZE)||amount!==(model?.sandPercent??100)){
   reset(size,amount);setGrid(size);setSand(amount);
  }else if(input.reset)reset();
  if(input.playing!==undefined){state.current.playing=input.playing;setPlaying(input.playing);}
  if(input.view!==undefined)changeView(input.view);
  if(input.speed!==undefined){state.current.speed=input.speed;setSpeed(input.speed);}
  if(input.strength!==undefined){state.current.strength=input.strength;setStrength(input.strength);}
  if(input.direction!==undefined){state.current.direction=input.direction;setDirection(input.direction);}
  if(input.variableWind!==undefined){state.current.variableWind=input.variableWind;setVariableWind(input.variableWind);}
  setWind(windAt(state.current));
  if(input.altitude!==undefined){state.current.altitude=input.altitude;setAltitude(input.altitude);}
 }),[]);

 const bearing=['N','NE','E','SE','S','SW','W','NW'][Math.round(wind.direction/45)%8];
 return <main className={`app ${view==='grain'?'grain-mode':''}`}>
  <header className="masthead"><div className="brand"><Mountain strokeWidth={1.1}/><span>DUNE</span><span className="edition">A field in motion</span></div><div className="header-actions"><a className="quiet-button download-link" href="./a-sea-of-sand.html" download="a-sea-of-sand.html" title="Download a self-contained HTML file" aria-label="Download HTML simulation"><Download/><span>HTML</span></a><button className="quiet-button" onClick={()=>setInfo(true)}><BookOpen/>The science</button><button className="quiet-button" aria-label="Toggle fullscreen" title="Fullscreen" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen?.().catch(()=>{});}}><Maximize/></button></div></header>
  <section className="scene" aria-label="Interactive dune migration simulation">
   <canvas ref={terrainRef} className="terrain" aria-label="An aerial view of migrating dunes. A continuous desert of sand dunes evolving through erosion, deposition and avalanching. Drag left or right to turn the camera." role="img" tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();state.current.yaw+=(e.key==='ArrowRight'?.08:-.08);}}} onPointerDown={e=>{drag.current={x:e.clientX,yaw:state.current.yaw};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current)state.current.yaw=drag.current.yaw-(e.clientX-drag.current.x)*.003;}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}/>
   {view==='grain'&&<div className="grain-scene"><canvas ref={grainRef} role="img" aria-label="Cross-section: sand grains hop up the gentle slope, cross the crest, and fall down the slip face."/><p className="grain-annotation">Grains hop up the gentle slope, then fall down the steep face. Each journey moves a little sand downwind.</p><div className="grain-legend"><i/>A highlighted grain · motion slowed for clarity</div></div>}
   <div className="scene-heading"><p className="eyebrow"><span className="live-dot"/>{view==='grain'?'Inside a moving dune':'Desert observatory / Sand transport'}</p><h1>{view==='grain'?'The shape travels.':'A sea of sand.'}</h1><p>{view==='grain'?'The dune moves because its grains do.':'Wind moves the sand. Gravity shapes the dunes.'}</p></div>
   <Tabs className="view-tabs" value={view} onValueChange={changeView}><TabsList aria-label="Viewpoint"><TabsTrigger value="aerial"><Plane/>Aerial</TabsTrigger><TabsTrigger value="above"><Layers/>Above</TabsTrigger><TabsTrigger value="grain"><CircleDot/>Grain journey</TabsTrigger></TabsList><TabsContent value="aerial">Oblique view from a stationary aircraft viewpoint</TabsContent><TabsContent value="above">Vertical view over the dunes</TabsContent><TabsContent value="grain">Schematic cross-section of grain transport</TabsContent></Tabs>
   <aside className="wind-panel" aria-label="Simulation controls"><div className="panel-label">Shaped by the wind</div><div className="wind-reading"><div className="compass"><span className="compass-north">N</span><ArrowUpRight style={{transform:`rotate(${wind.direction-45}deg)`}}/></div><div><strong>{wind.strength<=.3?'Below threshold':variableWind?'Changing wind':'Steady wind'}</strong><small>Toward {bearing} · {Math.round(wind.direction)%360}°</small></div></div>
   <div className="control"><div className="control-title"><label id="wind-label" title="Relative wind forcing; transport starts above 0.3×">Wind strength</label><output>{strength.toFixed(1)}×</output></div><Slider aria-labelledby="wind-label" min={0} max={2} step={.1} value={[strength]} onValueChange={v=>{const n=scalar(v);setStrength(n);state.current.strength=n;}}/></div>
   <div className="control"><div className="control-title"><label id="direction-label">{variableWind?'Mean direction':'Wind toward'}</label><output>{direction}°</output></div><Slider aria-labelledby="direction-label" min={0} max={360} step={5} value={[direction]} onValueChange={v=>{const n=scalar(v);setDirection(n);state.current.direction=n;setWind(windAt(state.current));}}/></div>
   <div className="wind-auto"><label htmlFor="variable-wind">Vary automatically</label><Switch id="variable-wind" checked={variableWind} onCheckedChange={v=>{setVariableWind(v);state.current.variableWind=v;setWind(windAt(state.current));}}/></div>
   <p className="wind-mode-note">{variableWind?'Direction swings and strength pulses over time.':'Set a direction, or let the wind shift over time.'}</p>
   <div className="control"><div className="control-title"><label id="altitude-label">View height</label><output>{altitude} m</output></div><Slider aria-labelledby="altitude-label" min={90} max={700} step={10} value={[altitude]} onValueChange={v=>{const n=scalar(v);setAltitude(n);state.current.altitude=n;}}/></div>
   <div className="panel-rule"/><div className="panel-label">Across the dune field</div><div className="migration"><span>Highest dune</span><strong>{fieldStats.maxHeight.toFixed(1)} m</strong></div><div className="migration"><span>Open ground</span><strong>{Math.round(fieldStats.bareFraction*100)}%</strong></div><div className="migration"><span>Sand conserved</span><strong>{(100*fieldStats.volume/fieldStats.initial).toFixed(1)}%</strong></div><p className="model-badge">Erosion · deposition · avalanches</p></aside>
   {error&&view!=='grain'&&<div className="error-overlay"><p>{error}</p><button className="quiet-button" onClick={()=>changeView('grain')}>Explore Grain journey <ArrowRight/></button></div>}
   <div className="scene-bottom"><div><div className="time-label">{view==='grain'?'Grain transport':'Model time'}</div><div className="time-value">{view==='grain'?'Hop. Fall. Repeat.':Math.floor(cycles).toLocaleString('en-GB')}{view!=='grain'&&<span>cycles</span>}</div></div><div className="scene-hint">{view==='grain'?<>Section aligned with wind<br/>Separate clock · aerial time paused</>:<><span className="drag-hint">Drag to look around · ← → to turn<br/></span>{view==='above'?'Vertical observation':'Stationary aerial observation'}<br/>Dunes to the horizon</>}</div></div>
  </section>
  <div className="transport" aria-label="Playback controls"><button className="play-button" onClick={toggle} aria-label={playing?'Pause simulation':'Play simulation'} title="Play / pause (Space)">{playing?<Pause size={18} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</button><button className="reset-button" aria-label="Reset elapsed time and camera" title="Restart" onClick={()=>reset()}><RotateCcw size={16}/></button><span className="clock-state">{playing?'Time flowing':'Time paused'}</span><div className="speed-control"><label id="speed-label">Speed</label><Slider aria-labelledby="speed-label" min={1} max={MAX_SIMULATION_SPEED} step={1} value={[speed]} onValueChange={v=>{const n=scalar(v);setSpeed(n);state.current.speed=n;}}/><div className="speed-reading">{view==='grain'?`${(speed/5).toFixed(1)}×`:<label className="target-speed"><input type="number" aria-label="Target cycles per second" ref={speedEntry} defaultValue={speed} min={1} max={MAX_SIMULATION_SPEED} step={1} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}} onBlur={e=>{
    const input=e.currentTarget;
    const next=Number.isFinite(input.valueAsNumber)?Math.min(MAX_SIMULATION_SPEED,Math.max(1,Math.round(input.valueAsNumber))):state.current.speed;
    input.value=String(next);setSpeed(next);state.current.speed=next;
   }}/> cy/s</label>}{view!=='grain'&&<small className="actual-rate">Actual {playing?Math.round(actualRate):0} cy/s{speed>DETAILED_SPEED_LIMIT&&<span className="fast-forward-note">Fast forward · approximate</span>}</small>}</div></div><p className="transport-note">{view==='grain'?'See how sand carries the dune forward.':<><span>Sand is conserved.</span> Wind and gravity reshape the dunes.</>}</p></div>
  {view!=='grain'&&<form className="field-settings" aria-label="Starting terrain" onSubmit={e=>{e.preventDefault();reset(grid,sand);}}>
   <div><label htmlFor="terrain-grid">Terrain resolution</label><select id="terrain-grid" value={grid} onChange={e=>setGrid(Number(e.target.value))}>{GRID_SIZES.map(size=><option key={size} value={size}>{size===128?'Coarse':size===256?'Standard':'Fine'} · {FIELD_SIZE/size} m cells</option>)}</select></div>
   <div><label htmlFor="starting-sand">Starting sand</label><select id="starting-sand" value={sand} onChange={e=>setSand(Number(e.target.value))}>{SAND_PERCENTAGES.map(amount=><option key={amount} value={amount}>{amount}%</option>)}</select></div>
   <button className="field-apply" type="submit" disabled={grid===(state.current.model?.size??GRID_SIZE)&&sand===(state.current.model?.sandPercent??100)}>Restart with settings</button>
   <p>{grid} × {grid} cells over the same 1.54 km patch. Finer grids resolve smaller features and run more slowly.</p>
  </form>}
  <footer className="bottom-caption"><p><em>Sand moves. The shape travels.</em><span>A travelling wave made of grains.</span></p><button className="caption-link" onClick={()=>setInfo(true)}>Why dunes move <ArrowRight size={16}/></button></footer>
  <Sheet open={info} onOpenChange={setInfo}><SheetContent className="info-sheet"><span className="eyebrow">Field notes / Transport model</span><SheetTitle>Sand moves.<br/>The landscape changes.</SheetTitle><SheetDescription>A reduced physical model within a continuous desert view.</SheetDescription>
   <h3>What is actually simulated?</h3><p>The landscape is a grid of stored sand thickness. Exposed cells lose sand to the wind; that same sand is carried downwind and deposited. Sheltered lee areas trap more sand. Gravity transfers sand down slopes that exceed a 32° repose criterion. The simulated patch has periodic boundaries: sand leaving one edge enters the opposite edge, conserving the total amount.</p>
   <h3>Why do the dunes continue to the horizon?</h3><p>The model covers a 1.54 km patch. Near the centre you see the simulated surface at its measured coordinates. Farther out, the panorama combines shifted, rotated samples of that same surface. This gives distant dunes different neighbours and spacing.</p>
   <h3>Where do new small dunes come from?</h3><p>Some crescent dunes shed smaller dunes from their flanks. Here, sustained transport can gradually move sand from a thick deposit into a smaller one downwind. Both deposits then evolve under the wind. The transfer conserves sand. Its timing, size and location are simplified model choices.</p>
   <h3>Smooth faces or thousands of ripples?</h3><p>Both occur. Fine wind ripples can cover the exposed side, while avalanche faces can appear much smoother. Ordinary ripples are far smaller than dunes. At the current grid spacing of {state.current.model?.cell??FIELD_SIZE/GRID_SIZE} m, centimetre-scale ripples are too small to see. A finer grid samples the same dunes at more points. Starting sand changes the volume of sand available to move.</p>
   <h3>Wind changes the transport.</h3><p>Direction steers where eroded sand is deposited. Strength has a transport threshold and a nonlinear response. Automatic variation changes both. Dunes reshape through redistribution of sand; the terrain is never rotated or translated to fake a wind response.</p>
   <h3>What the clock means.</h3><p>A cycle is a nominal unit of bulk sand-transport time, not a year. Up to 20 cy/s, the model calculates each cycle in detail. Above that, fast forward moves more sand per update using larger, approximate time steps. The counter advances by the model time actually integrated; it does not claim that every detailed cycle was calculated separately. Actual cy/s shows the achieved rate.</p>
   <h3>What changes in fast forward?</h3><p>Wind moves a larger amount of sand before the surface is recalculated. Sand conservation and slope relaxation still apply, but individual erosion and deposition events are less finely resolved. Strong or changing winds use shorter steps. Fast forward is useful for exploring landscape evolution; its trajectory differs from detailed stepping. The shape and drawing detail are unchanged when you return to low speeds, but only Restart returns to the original landscape.</p>
   <p className="model-note">Based on simplified bulk-sediment modelling ideas, including Werner (1995). This is not a grain-by-grain simulation or a full computational fluid dynamics model. Saltation is represented by grid-scale transport parcels and empirical deposition rules. Cell size, hop length, erosion rate and initial dune shapes are chosen model parameters, not a calibrated reconstruction of the Sahara. Texture interpolation smooths the grid for display. The grain journey remains a separate explanatory diagram.</p>
   <div className="sources">Model and background:<br/><a href="https://scholars.duke.edu/publication/971408" target="_blank" rel="noreferrer">Worman et al. · Dune calving and field structure ↗</a><br/><a href="https://sseh.uchicago.edu/doc/Werner_1995.pdf" target="_blank" rel="noreferrer">Werner · Eolian dunes: Computer simulations ↗</a><br/><a href="https://pubs.usgs.gov/gip/deserts/dunes/" target="_blank" rel="noreferrer">USGS · Dune types and surface ripples ↗</a><br/><a href="https://www.usgs.gov/geology-and-ecology-of-national-parks/geology-great-sand-dunes-national-park" target="_blank" rel="noreferrer">USGS · Sand transport and angle of repose ↗</a></div>
  </SheetContent></Sheet>
 </main>;
}

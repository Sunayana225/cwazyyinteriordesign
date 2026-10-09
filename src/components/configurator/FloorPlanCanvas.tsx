'use client';
import type { ClosetLayout } from '@/types/closet';
import { renderFloorPlan } from '@/renderer/FloorPlanRenderer';
import { DrawingCanvas, type CanvasView, type RoomObjectKind } from './DrawingCanvas';

export default function FloorPlanCanvas({layout,views,onObjectClick}:{layout:ClosetLayout;views:Map<string,CanvasView>;onObjectClick:(kind:RoomObjectKind,id:string)=>void}) {
  return <DrawingCanvas viewKey="floor-plan" views={views} onObjectClick={onObjectClick} svg={renderFloorPlan(layout,{roomWidth:layout.roomDimensions?.roomWidth??layout.dimensions.width,roomDepth:layout.roomDimensions?.roomDepth??layout.dimensions.depth,unitDepth:layout.dimensions.depth,interactive:true})}/>;
}

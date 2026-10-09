import type { UserRole } from '@/types/closet';
import type { PrintSettings } from './printSettings';

export const USER_ROLES: readonly UserRole[] = ['homeowner','renter','designer','architect','browsing'];
export function isUserRole(value:unknown):value is UserRole {
  return typeof value==='string' && USER_ROLES.includes(value as UserRole);
}
export type StudioTool = 'drawers'|'arrange'|'style'|'spatial'|'floor'|'fit'|'room'|'inventory'|'library'|'print';
interface StarterTask { action:StudioTool|'brief'|'gallery'; title:string; detail:string; }
interface RoleWorkflow {
  label:string; introduction:string; heading:string; description:string;
  tasks:readonly StarterTask[]; tools:readonly StudioTool[]; printDescription:string;
}
export const ROLE_WORKFLOWS:Record<UserRole,RoleWorkflow> = {
  homeowner:{
    label:'Homeowner',introduction:'Plan around your space and everyday wardrobe',
    heading:'Make this design your own',description:'Start with your room and wardrobe, then refine the details.',
    tasks:[{action:'brief',title:'Set your brief',detail:'Shape, measurements & inventory'},
      {action:'drawers',title:'Customize a drawer',detail:'Try templates, dividers & labels'},
      {action:'fit',title:'Review what fits',detail:'Capacity, shortfalls & alternatives'}],
    tools:['inventory','drawers','style','fit'],
    printDescription:'Elevations, organizer plans, household totals, and reserve notes for your design review.',
  },
  renter:{
    label:'Renter',introduction:'Work around the room you already have',
    heading:'Plan around your existing space',description:'Record fixed features, arrange storage, and check access before discussing installation.',
    tasks:[{action:'room',title:'Record fixed features',detail:'Doors, windows, baseboards & obstacles'},
      {action:'arrange',title:'Arrange your storage',detail:'Edit modules within the available wall'},
      {action:'fit',title:'Check capacity & access',detail:'Review shortages and room clearances'}],
    tools:['room','arrange','fit','library'],
    printDescription:'Elevations, floor plan where available, and room openings for an installation discussion.',
  },
  designer:{
    label:'Interior designer',introduction:'Develop a collection and present it to your client',
    heading:'Refine the client presentation',description:'Coordinate finishes, customize interiors, and prepare a labeled design package.',
    tasks:[{action:'style',title:'Set the material direction',detail:'Finishes, front styles & hardware'},
      {action:'drawers',title:'Detail the interiors',detail:'Organizers, compartments & labels'},
      {action:'print',title:'Prepare client presentation',detail:'Project details, drawings & material estimates'}],
    tools:['style','drawers','library','spatial','print'],
    printDescription:'All elevations, organizer plans, notes, and estimated organizer materials for client review.',
  },
  architect:{
    label:'Architect',introduction:'Coordinate measured geometry and review the drawing set',
    heading:'Coordinate the space and drawing set',description:'Start with room constraints, review calculated fit, and prepare the coordination package.',
    tasks:[{action:'room',title:'Coordinate room geometry',detail:'Openings, offsets & clearances'},
      {action:'fit',title:'Audit capacity & constraints',detail:'Review measured demand and unresolved fit'},
      {action:'print',title:'Prepare coordination drawings',detail:'Elevations, floor plan & opening schedule'}],
    tools:['room','floor','fit','arrange','print'],
    printDescription:'All elevations, floor plan where available, organizer details, and the room opening/obstacle schedule. Planning drawings require project-specific review before construction.',
  },
  browsing:{
    label:'Just browsing',introduction:'Explore ideas before defining your project',
    heading:'Explore what your space could become',description:'Start with a gallery study, try a finish, and inspect the spatial preview.',
    tasks:[{action:'gallery',title:'Explore the gallery',detail:'Open an editable design study'},
      {action:'style',title:'Try a different finish',detail:'Compare material and style directions'},
      {action:'spatial',title:'Explore in 3D',detail:'See how the current design is arranged'}],
    tools:['spatial','style','library','floor'],
    printDescription:'A simple set of elevations and a floor plan where available for comparing ideas.',
  },
};

/** Explicit opt-in presets change document contents only, preserving project/contact,
 * paper choices and revision comparisons. Switching roles never applies these silently. */
export function rolePrintPreset(role:UserRole,current:PrintSettings,walls:string[]):PrintSettings & {walls:string[]} {
  const professional=role==='designer'||role==='architect';
  return {...current,walls:[...walls],floorPlan:true,notes:role!=='browsing',
    organizers:role==='homeowner'||professional,materials:role==='designer',
    roomSchedule:role==='architect'||role==='renter',household:role==='homeowner',reserveNotes:role==='homeowner'};
}

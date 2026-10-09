import { describe, it, expect } from 'vitest';
import { workspaceReview } from '@/lib/workspaceReview';
import { DEFAULT_CONFIG } from '@/lib/design';
import { ClosetLayoutEngine } from '@/engine/ClosetLayoutEngine';

function clearLayout() {
  const layout=new ClosetLayoutEngine(DEFAULT_CONFIG).calculateLayout();
  layout.capacity=[{label:'Bags',required:2,available:2,unit:'bags'}];
  layout.layoutWarnings=[];layout.inputWarnings=[];
  return layout;
}

describe('live workflow guidance',()=>{
  it('prioritizes an actual room conflict over a shortage for every working role',()=>{
    const layout=clearLayout();
    layout.planning={windows:[{id:'outside',wall:'back',offset:90,width:24,sill:36,height:36}]};
    layout.capacity![0].required=20;
    for(const role of ['homeowner','designer','architect','renter'] as const){
      const review=workspaceReview(role,layout);
      expect(review.next.action).toBe('room');expect(review.issues).toHaveLength(1);
      expect(review.next.detail).toContain('18.00 in beyond');expect(review.fit.shortfalls).toHaveLength(1);
    }
    layout.planning={};
    expect(workspaceReview('homeowner',layout).next.action).toBe('fit');
  });
  it('does not treat empty demand or an unrecorded survey as completed work',()=>{
    const layout=clearLayout();layout.capacity=[];
    expect(workspaceReview('homeowner',layout).next.action).toBe('inventory');
    layout.capacity=[{label:'Bags',required:2,available:2,unit:'bags'}];
    expect(workspaceReview('architect',layout).next.title).toBe('Confirm the room survey');
  });
  it('uses category tolerance consistently and never combines incompatible units',()=>{
    const layout=clearLayout();layout.capacity=[
      {label:'Rod',required:20,available:19.995,unit:'inches of rod'},
      {label:'Sneakers',required:6,available:4,unit:'pairs'},
      {label:'Bags',required:0,available:4,unit:'bags'},
    ];
    const review=workspaceReview('homeowner',layout);
    expect(review.fit.total).toBe(2);expect(review.fit.covered).toBe(1);
    expect(review.fit.shortfalls.map(r=>r.label)).toEqual(['Sneakers']);
  });
  it('keeps caution notices ahead of export suggestions',()=>{
    const layout=clearLayout();layout.inputWarnings=['A requested value was adjusted.'];
    layout.layoutWarnings=[{id:'one',message:'Check this layout.',designerNote:'Review',severity:'caution'}];
    expect(workspaceReview('designer',layout).next.action).toBe('fit');
    expect(workspaceReview('designer',layout).notices).toHaveLength(2);
  });
  it('offers different handoffs after modeled conflicts and shortages are resolved',()=>{
    const layout=clearLayout();layout.planning={windows:[{id:'survey',wall:'back',offset:4,width:12,sill:92,height:2}]};
    const before=structuredClone(layout);
    expect(workspaceReview('homeowner',layout,'current').next.action).toBe('library');
    expect(workspaceReview('architect',layout,'current').next.title).toBe('Review coordination package');
    expect(workspaceReview('designer',layout,'current').next.title).toBe('Prepare the client review');
    expect(workspaceReview('architect',layout,'stale').next.title).toBe('Recheck the changed room');
    expect(layout).toEqual(before);
  });
});

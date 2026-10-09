import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {downloadText} from '@/lib/download';

const link={href:'',download:'',click:vi.fn(),remove:vi.fn()};
const create=vi.fn(()=>link),append=vi.fn();
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('document',{createElement:create,body:{appendChild:append}});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:download');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();create.mockReset().mockImplementation(()=>link);append.mockReset();link.click.mockReset();link.remove.mockReset();});

it('releases a successful download after the browser can consume it',()=>{
  downloadText('drawing','drawing.svg','image/svg+xml');expect(link.download).toBe('drawing.svg');expect(link.href).toBe('blob:download');expect(link.click).toHaveBeenCalledOnce();expect(link.remove).toHaveBeenCalledOnce();expect(URL.revokeObjectURL).not.toHaveBeenCalled();vi.runAllTimers();expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:download');
});
it.each(['create','append','click','remove'])('releases the URL when %s fails',stage=>{
  const action={create,append,click:link.click,remove:link.remove}[stage]!;action.mockImplementationOnce(()=>{throw new Error(stage+' failed');});
  expect(()=>downloadText('backup','backup.json')).toThrow(stage+' failed');vi.runAllTimers();expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:download');
  if(stage!=='create')expect(link.remove).toHaveBeenCalledOnce();
});

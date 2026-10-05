'use client';
import { useMemo, useState } from 'react';
import { buildPrintDocument } from '@/engine/PDFExporter';
import type { PDFExportOptions } from '@/engine/PDFExporter';
export function PrintPagePreview({options}:{options:PDFExportOptions}){
  const [count,setCount]=useState(0),[oversized,setOversized]=useState<string[]>([]);
  const settings=options.settings!,portrait=settings.paper==='Letter'?[215.9,279.4]:[210,297],paper=settings.orientation==='landscape'?[portrait[1],portrait[0]]:portrait;
  const html=useMemo(()=>buildPrintDocument([options]),[options]);
  return <div><p className="text-xs">Measured preview: {count||'preparing'} pages at {paper[0]} × {paper[1]} mm. Browser print margins and font substitution can change final breaks.</p>{oversized.length>0&&<p role="alert">Blocks taller than one printable page: {oversized.join(', ')}. Reduce content or change paper orientation.</p>}<iframe title="Measured print page breaks" sandbox="allow-same-origin" className="w-full h-96 border" srcDoc={html} onLoad={async e=>{
    const doc=e.currentTarget.contentDocument;if(!doc)return;await doc.fonts.ready;
    const article=doc.querySelector('article');if(!article)return;
    const width=(paper[0]-30)*96/25.4,height=(paper[1]-30)*96/25.4;
    const style=doc.createElement('style');style.textContent=`body{max-width:none;width:${width+40}px;padding:10px;margin:0;background:#ddd}.preview-page{box-sizing:content-box;width:${width}px;min-height:${height}px;padding:15px;background:white;margin-bottom:16px;border:1px solid #777;overflow-wrap:anywhere}.preview-measure{width:${width}px}.drawing,.schedule{break-before:auto}table{width:100%;table-layout:fixed}td{overflow-wrap:anywhere}svg{max-width:100%}`;doc.head.append(style);
    const measure=doc.createElement('div');measure.className='preview-measure';doc.body.append(measure);const source=Array.from(article.children);article.remove();doc.querySelector('.print-revision')?.remove();
    let page:HTMLElement|null=null,used=0,pages=0;const tooTall:string[]=[];
    const newPage=()=>{page=doc.createElement('section');page.className='preview-page';page.setAttribute('aria-label',`Page ${++pages}`);doc.body.insertBefore(page,measure);used=0;};newPage();
    const place=(node:Element)=>{measure.append(node);const rect=node.getBoundingClientRect(),css=doc.defaultView!.getComputedStyle(node),size=rect.height+(parseFloat(css.marginTop)||0)+(parseFloat(css.marginBottom)||0);if(size>height)tooTall.push((node.textContent??'Drawing').trim().slice(0,80));if(used&&used+size>height)newPage();page!.append(node);used+=size;};
    const placeTable=(source:Element)=>{
      const header=source.querySelector('thead'),rows=Array.from(source.querySelectorAll('tbody>tr'));
      if(!rows.length){place(source);return;}
      let table=doc.createElement('table'),body=doc.createElement('tbody');
      const start=()=>{table=doc.createElement('table');if(header)table.append(header.cloneNode(true));body=doc.createElement('tbody');table.append(body);measure.append(table);};start();
      for(const row of rows){body.append(row);if(used+table.getBoundingClientRect().height>height){row.remove();if(body.children.length){place(table);newPage();}else if(used)newPage();start();body.append(row);}if(table.getBoundingClientRect().height>height)tooTall.push((row.textContent??'Table row').slice(0,80));}
      if(body.children.length)place(table);else table.remove();
    };
    for(const node of source){if((node.classList.contains('drawing')||node.classList.contains('schedule'))&&used)newPage();
      if(node.tagName==='SECTION'){for(const child of Array.from(node.children)){if(child.tagName==='TABLE')placeTable(child);else place(child);}}
      else if(node.tagName==='TABLE')placeTable(node);else place(node);
    }
    measure.remove();setCount(pages);setOversized(Array.from(new Set(tooTall)));
  }}/></div>;
}


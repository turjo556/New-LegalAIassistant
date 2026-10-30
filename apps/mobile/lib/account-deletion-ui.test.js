import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
const require=createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const text=n=>typeof n==='string'?n:(n.children||[]).map(text).join('');
for(const language of ['en','fr'])test('native deletion: '+language+' requires explicit confirmation, clears password and shows reviewed request truthfully',async()=>{
 const result=await build({stdin:{contents:"export {default} from './components/AccountDeletion';export {setLanguage} from './lib/i18n';",resolveDir:new URL('..',import.meta.url).pathname},bundle:true,write:false,format:'cjs',platform:'node',loader:{'.js':'jsx'},external:['react'],plugins:[{name:'native',setup(b){b.onResolve({filter:/^react-native$/},()=>({path:'native',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:"export const View='View',Text='Text',TextInput='TextInput',Pressable='Pressable',Switch='Switch';export const StyleSheet={create:x=>x};"}));}}]});
 const mod={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,mod,mod.exports);mod.exports.setLanguage(language);
 const calls=[];let fail=true,refreshed=0,tree;
 try{
 await act(async()=>{tree=TestRenderer.create(React.createElement(mod.exports.default,{data:{},api:{request:async(path,body)=>{calls.push({path,body});if(fail)throw Error('Incorrect password.');return {requested:true};}},refresh:async()=>{refreshed++;}}));});
 const input=i=>tree.root.findAllByType('TextInput')[i];const button=()=>tree.root.findByType('Pressable');
 assert.equal(button().props.disabled,true);assert.equal(input(0).props.secureTextEntry,true);
 await act(async()=>{input(0).props.onChangeText('wrong-password');input(1).props.onChangeText('delete');});assert.equal(button().props.disabled,true);
 await act(async()=>input(1).props.onChangeText('DELETE'));assert.equal(button().props.disabled,false);
 await act(async()=>button().props.onPress());assert.equal(calls.length,1);assert.equal(input(0).props.value,'');assert.ok(text(tree.root).includes('Incorrect password.'));assert.equal(refreshed,0);
 fail=false;await act(async()=>input(0).props.onChangeText('correct-password'));await act(async()=>button().props.onPress());
 assert.deepEqual(calls[1],{path:'account/deletion/request',body:{confirmation:'DELETE',password:'correct-password'}});assert.equal(refreshed,1);assert.equal(tree.root.findAllByType('TextInput').length,0);
 const content=text(tree.root);assert.ok(content.includes(language==='fr'?'Votre compte reste actif':'Your account remains active'));assert.ok(!content.includes('30 days'));
 }finally{if(tree)await act(async()=>tree.unmount());}
});

import struct, json, base64, sys
b=open(sys.argv[1],'rb').read(); off=12; js=None; bin_=None
while off<len(b):
    ln,typ=struct.unpack_from('<II',b,off); data=b[off+8:off+8+ln]; off+=8+ln
    if typ==0x4E4F534A: js=json.loads(data)
    elif typ==0x004E4942: bin_=data
js['buffers'][0]['uri']='data:application/octet-stream;base64,'+base64.b64encode(bin_).decode()
json.dump(js,open(sys.argv[2],'w'),separators=(',',':'))

#include <math.h>
#include <stddef.h>
#define MAX_OBSTACLES 512
#define MAX_PEERS 16384
// Plain double buffers; no renderer, clock, allocation, or host callbacks.
static int ambiguous=0;
static int samples(double x,double z,double qx,double qz,double r){double ratio=hypot(x-qx,z-qz)/fmax(.08,r*.5);if(fabs(ratio-round(ratio))<1e-12)ambiguous=1;return (int)fmax(1,ceil(ratio));}
static double obstacles[MAX_OBSTACLES * 6], peers[MAX_PEERS * 3], result[2];
__attribute__((visibility("default"))) double *obstacle_buffer(void){return obstacles;}
__attribute__((visibility("default"))) double *peer_buffer(void){return peers;}
__attribute__((visibility("default"))) double *result_buffer(void){return result;}
static int overlap(double x,double z,double r,const double *o){
 double dx=x-o[0],dz=z-o[1];
 if(o[2]>=0){double reach=r+o[2];if(fabs(dx)>reach||fabs(dz)>reach)return 0;return hypot(dx,dz)<reach;}
 double c=cos(o[5]),s=sin(o[5]),lx=dx*c-dz*s,lz=dx*s+dz*c;
 if(fabs(lx)>o[3]/2+r+1e-9||fabs(lz)>o[4]/2+r+1e-9)return 0;
 return hypot(fmax(0,fabs(lx)-o[3]/2),fmax(0,fabs(lz)-o[4]/2))<r;
}
static int clear_obstacles(double x,double z,double qx,double qz,double r,int count,double w,double d){
 int n=samples(x,z,qx,qz,r);
 for(int i=0;i<=n;i++){double px=x+(qx-x)*i/n,pz=z+(qz-z)*i/n;if(!(fabs(px)<w/2-r-.2&&fabs(pz)<d/2-r-.2))return 0;for(int k=0;k<count;k++)if(overlap(px,pz,r,obstacles+k*6))return 0;}return 1;
}
static int clear_peer(double x,double z,double qx,double qz,double r,const double *p){
 int n=samples(x,z,qx,qz,r);double reach=r+p[2];
 for(int i=0;i<=n;i++){double dx=x+(qx-x)*i/n-p[0],dz=z+(qz-z)*i/n-p[1];if(fabs(dx)<=reach&&fabs(dz)<=reach&&hypot(dx,dz)<reach)return 0;}return 1;
}
__attribute__((visibility("default"))) int avoid_pen_step(double x,double z,double tx,double tz,double step,double r,double w,double d,int no,int np){
 if(no<0||no>MAX_OBSTACLES||np<0||np>MAX_PEERS)return 0;
 ambiguous=0;result[0]=x;result[1]=z;double distance=hypot(tx-x,tz-z);if(distance<.001)return 1;
 double turns[]={0,.35,-.35,.7,-.7,1.1,-1.1,1.55,-1.55,2.1,-2.1,2.6,-2.6,3.14159265358979323846};double heading=atan2(tz-z,tx-x),best=INFINITY,reach=fmin(step,distance);
 for(int j=0;j<14;j++){double turn=turns[j],angle=heading+turn,qx=x+cos(angle)*reach,qz=z+sin(angle)*reach;if(!clear_obstacles(x,z,qx,qz,r,no,w,d))continue;int valid=1;double pressure=0;
  for(int k=0;k<np;k++){const double *p=peers+k*3;double gap=hypot(qx-p[0],qz-p[1])-(r+p[2]);if(!clear_peer(x,z,qx,qz,r,p)){valid=0;break;}pressure+=fmax(0,.8-gap)*.1;}
  if(!valid)continue;double score=hypot(qx-tx,qz-tz)+fabs(turn)*step*.12+pressure+(turn<0?.015*step:0);if(score<best){best=score;result[0]=qx;result[1]=qz;}
 }return !ambiguous;
}

function give_precision_of_proba(Z)
{
if(Z<2.33)
{precision_for_p=2}
else if(Z<3.10)
{precision_for_p=3}
else if(Z<3.72)
{precision_for_p=4}
else if(Z<4.27)
{precision_for_p=5}
else if(Z<4.76)
{precision_for_p=6}
else if(Z<5.20)
{precision_for_p=7}
else if(Z<5.62)
{precision_for_p=8}
else
{precision_for_p=9}
return precision_for_p;
}
//----------------------------------------
function erf(x)
{
  //erf stand for error function or Gauss error function
  
  var answer = 0;
  var a1 = 0.254829592;
  var a2 = -0.284496736;
  var a3 = 1.421413741;
  var a4 = -1.453152027;
  var a5 = 1.061405429;
  var p = 0.3275911;
  x = Math.abs(x);
  var t = 1 / (1 + p * x);
  //Horner's method, takes O(n) operations for nth order polynomial
  answer = 1 - ((((((a5 * t + a4) * t) + a3) * t + a2) * t) + a1) * t * Math.exp(-1 * x * x);
  return answer; 
}
//--------------------------
function NORMDIST(x,mu,sigma)
{
 /* The Normal distribution probability density function (PDF)
   for the specified mean and specified standard deviation: */
  var PDF=0;
  if(sigma!=0)
   {
   var num = Math.exp(-Math.pow(((x - mu)/sigma), 2) / 2);
   var denom = sigma * Math.sqrt(2 * Math.PI);
   PDF= num/denom;
   }
  return PDF;
};
//--------------------------
function NORMSDIST(z) // return a left probability value given a Z value
{
var left_probability = 0;
var sign = 1;
if (z < 0) sign = -1;
left_probability = 0.5 * (1.0 + sign * erf(Math.abs(z)/Math.sqrt(2)));
return left_probability;
}
//--------------------------
function NORMSINV(p) // return a Z value given a probability p in [0..1]
{
  var a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
  var a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
  var b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887;
  var b4 = 66.8013118877197, b5 = -13.2806815528857, c1 = -7.78489400243029E-03;
  var c2 = -0.322396458041136, c3 = -2.40075827716184, c4 = -2.54973253934373;
  var c5 = 4.37466414146497, c6 = 2.93816398269878, d1 = 7.78469570904146E-03;
  var d2 = 0.32246712907004, d3 = 2.445134137143, d4 = 3.75440866190742;
  var p_low = 0.02425, p_high = 1 - p_low;
  var q, r;
  var Z;

  if ((p < 0) || (p > 1))
  {
      alert("NORMSINV: Argument out of range.");
  }
  else if (p == 0)
  {
       Z=-Infinity;
  }
  else if (p==1)
  {
       Z=Infinity;
  }
  else if (p < p_low)
  {
      q = Math.sqrt(-2 * Math.log(p));
      Z = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
  else if (p <= p_high)
  {
      q = p - 0.5;
      r = q * q;
      Z = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  }
  else
  {
      q = Math.sqrt(-2 * Math.log(1 - p));
      Z = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
  return Z;
}
// -----------------------------------------------------------------------
function calc_process_capability(mean_arr,mean, stdev,LSL,USL,normality)
{
  // ------------------------------
  function find_probability_observed(mean_arr,LSL,USL,LSL_USL_type)
  {
  var count_defects_LSL=0;
  var count_defects_USL=0;
  var len=mean_arr.length;
  let probability=[];
  if (len>0)
    {   
    for (let i=0;i<len;i++)
     {    
       if (LSL_USL_type=="LSL" || LSL_USL_type=="LSL_USL")
        {
         if (mean_arr[i]<LSL)
            {count_defects_LSL=count_defects_LSL+1}
        }
       if(LSL_USL_type=="USL" || LSL_USL_type=="LSL_USL")
        {
          if (mean_arr[i]>USL)
          {count_defects_USL=count_defects_USL+1}
        }
     }
     count_defects=count_defects_LSL+count_defects_USL;
     probability[0]=count_defects/len;
     probability[1]=count_defects_LSL/len;
     probability[2]=count_defects_USL/len;
    }
    return probability;
  }
  // ------------------------------
  let Z=[];
  var Z_LSL;
  var Z_USL;
  var p_LSL;
  var p_USL;
  var p_total;
  if (normality===true && stdev>=0)
  {
    if (!isNaN(LSL) && !isNaN(USL))
    {
      Z_LSL=(mean-LSL)/stdev;
      p_LSL=1-NORMSDIST(Z_LSL);
      Z_USL=(USL-mean)/stdev;
      p_USL=1-NORMSDIST(Z_USL);
      p_total=p_LSL+p_USL;
      Z[0]=-NORMSINV(p_total); // Z
      Z[1]=Z_LSL;
      Z[2]=Z_USL;
      Z[3]=p_total;
      Z[4]=p_LSL;
      Z[5]=p_USL;
    }
    else if (!isNaN(LSL) || !isNaN(USL))
    {
     if (!isNaN(LSL))
      {
      Z_LSL=(mean-LSL)/stdev;
      p_LSL=1-NORMSDIST(Z_LSL);
      Z[0]=Z_LSL; // Z
      Z[1]=Z_LSL; // Z_LSL
      //Z[2]=Z_USL; Undefined
      Z[3]=p_LSL; // p_total
      Z[4]=p_LSL;
      //Z[5] p_USL undefined
      }
     else
      {
      Z_USL=(USL-mean)/stdev;
      p_USL=1-NORMSDIST(Z_USL);
      Z[0]=Z_USL; // Z
      // Z[1]=Z_LSL; // Z_LSL undefined
      Z[2]=Z_USL;
      Z[3]=p_USL; // p_total
      // Z[4]=p_LSL; undefined
      Z[5]=p_USL;
      }
    }
  }
  else // non normal
  {
    if (!isNaN(LSL) && !isNaN(USL))
    {
    LSL_USL_type="LSL_USL";
    let p_total=[];
    p_total=find_probability_observed(mean_arr,LSL,USL,LSL_USL_type);
    Z[0]=-NORMSINV(p_total[0]);
    Z[1]=-NORMSINV(p_total[1]);
    Z[2]=-NORMSINV(p_total[2]);
    Z[3]=p_total[0];
    Z[4]=p_total[1];
    Z[5]=p_total[2]
    }
  else if (!isNaN(LSL) || !isNaN(USL))
    {
    if (!isNaN(LSL))
      {    
        LSL_USL_type="LSL";
        p_LSL=find_probability_observed(mean_arr,LSL,USL,LSL_USL_type);
        Z_LSL=-NORMSINV(p_LSL);
        Z[0]=Z_LSL; // Z total
        Z[1]=Z_LSL;
        // Z[2] Z_USL Undefined
        Z[3]=p_LSL; //p_total=p_LSL
        Z[4]=p_LSL;
        //Z[5]=p_USL Undefined
      }
    else {
        LSL_USL_type="USL";
        p_USL=find_probability_observed(mean_arr,LSL,USL,LSL_USL_type);
        Z_USL=-NORMSINV(p_USL);
        Z[0]=Z_USL; // Z total
        // Z[1] Z_LSL Undefined
        Z[2]=Z_USL;
        Z[3]=p_USL; // p_total=p_USL
        //Z[4]=p_LSL Undefined
        Z[5]=p_USL;
      }
    }
  }
  return Z;
}
//--------------------------
function calc_sample_size(alpha,delta,historical_sigma)
{
  var constant_alpha;
  if (alpha==0.05)
  {
   constant_alpha=1.96; 
  }
  else if (alpha==0.01)
  {
    constant_alpha=2.58;
  }
  else if (alpha==0.10)
  {
    constant_alpha=1.645;
  }
  // ROUNDUP(((Const_alpha*sigma)/delta)**2,0)
  min_sample_size=(4*constant_alpha*historical_sigma/delta)**2;
  min_sample_size=Math.round(min_sample_size + Number.EPSILON);
  if (min_sample_size<1)
  {min_sample_size=1;}
  return min_sample_size;
}
function normality_test(sorted_Array)
{
    var AD;
    var Z;
    var p_value;
    let AD_values=[];
    var sum_s_alter=0;
    length=sorted_Array.length;

  if (length>0)
  {
    for (let i=0;i<length;i++)
    {
      Z=(sorted_Array[i]-mean)/stdev;
      p=NORMSDIST(Z);
      log_p=Math.log(p);
      log_1_minus_p=Math.log(1-p);
      s_alter=((2*(i+1)-1)*log_p) +((2*(length-(i+1))+1)*log_1_minus_p); // (((2*B9)-1)*BN9)+((2*($BK$9-B9)+1)*BO9)
      sum_s_alter=sum_s_alter+s_alter;
    }
    AD_values[0]=-length-(sum_s_alter/length); // AD value -$BK$9-(BV8/$BK$9)
    /* A_power2_prime=AD_values[0]*(1+(4/length)-(25/(length*length))); //BT9*(1+(4/$BK$9)-(25/($BK$9*$BK$9)))*/
    Am=AD_values[0]*(1+(0.75/length)+(2.25/(length*length))); //BT9*(1+(0.75/$BK$9)+(2.25/($BK$9*$BK$9))) 
    /* IF(BT15<0.2,1-EXP(-13.436+101.14*BT15-223.73*BT15^2),
        IF(BT15<0.34,1-EXP(-8.318+42.796*BT15-59.938*BT15^2),
         IF(BT15<0.6,EXP(0.9177-4.279*BT15-1.38*BT15^2),
         IF(1.2937-5.709*BT15+0.0186*BT15^2<$BS$25,EXP(1.2937-5.709*BT15+0.0186*BT15^2),$BT$23)))) */
    if(Am<0.2)
      {
      p_value=1-Math.exp(-13.436+101.14*Am-223.73*Am**2);
      }
    else if (Am<0.34)
      {
      p_value=1-Math.exp(-8.318+42.796*Am-59.938*Am**2);
      }
    else if (Am<0.6)
      {
      p_value=Math.exp(0.9177-4.279*Am-1.38*Am**2);
      }
    else
      {
        p_value=Math.exp(1.2937-5.709*Am+0.0186*Am**2);
      }
    console.log('in normality_test, AD='+AD_values[0]);
    console.log('in normality_test, p_value='+p_value);
    AD_values[1]=p_value; // p_value
  }
  return AD_values;
}

function AI_round(number, precision, fixed)
{
  //round number to requested decimal precision - fixed precision or not
  var rounded_nbr;
  if (fixed)
    {
    rounded_nbr = (Math.round((number + Number.EPSILON)*10**precision)/10**precision).toFixed(precision);
    }
  else
    {
      rounded_nbr = Math.round((number + Number.EPSILON)*10**precision)/10**precision;
    }
  return rounded_nbr;
}
function getDigits(v) {
  var s = v.toString(),
      i = s.indexOf('.') + 1;
  return i && s.length - i;
}
function calc_mean(last,myfinal_Array)
{
 var sum=0;
 var mean=0;
 var precision=0;
 let mean_arr=[];
 console.log("in function calc_basic_stats, nbr of items in myfinal_Array: " + last);
 var n=last-1;
 if(n > 0)
 {
    // calculate mean (even if holes in sample)
    for (let i=0; i < n ; i++)
    { 
     mean_arr[i]=myfinal_Array[i+1][1];
     var numbr=parseFloat(myfinal_Array[i+1][1]);
     if (!isNaN(numbr))
      {
        sum=sum+numbr;
        newdigits=getDigits(numbr);
        if(newdigits>precision)
          {precision=newdigits;
          }
      }
    else
      {
        n=n-1;
      }
    }
    if(n>0)
    {
        mean=sum/n;
    }
    
 }
 else
      {
      mean=NULL;
      n=0;
      }
 mean_arr[n]=mean;
 mean_arr[n+1]=precision;
 mean_arr[n+2]=n;
 return mean_arr;
}
function calc_variance(last,myfinal_Array,mean,sample)
{
 var variance=0;
 var n=last-1;
if (n > 1)
  {
      for (let i=1; i < last ; i++)
      {
        var numbr=parseFloat(myfinal_Array[i][1]);
          if (!isNaN(numbr))
          {
            variance=variance+((numbr-mean)**2);
          }
          else
          {
            n=n-1;
          }
      }
      if(sample)
      {
        if (n>1)
        {
          variance=variance/(n-1);
        }
      }
      else if (n>0)
      {
          variance=variance/n;
      }
  }
 else
  {
    variance=NULL;
  }
 return variance;
}
function calc_stdev(variance)
{
var stdev;
if(isNaN(variance) || variance < 0)
{
  stdev=undefined;
}
else
{
  stdev=Math.sqrt(variance);
}
return stdev;
}
function calc_quartiles(myarray)
{
var median;
var min=Infinity;
var max=-Infinity;

var length=myarray.length;

  if (length>0)
  {
    for (let i=0;i<length;i++)
    {
      if (myarray[i]<min)
      {
       min=myarray[i]; 
      };
      if (myarray[i]>max)
      {
        max=myarray[i];
      }
    } 
    nums = [...myarray].sort((a, b) => a - b);
    const p25 = Math.floor(myarray.length / 4);
    const mid = Math.floor(myarray.length / 2);
    const p75 = Math.floor(myarray.length*3 / 4);
    if (myarray.length % 2 !== 0 )
    {
      Q1=nums[p25];
      median=nums[mid];
      Q3=nums[p75];
    }
    else
    {
     Q1=(nums[p25 - 1] + nums[p25]) / 2;
     median=(nums[mid - 1] + nums[mid]) / 2;
     Q3=(nums[p75 - 1] + nums[p75]) / 2;
    }
    nums[length]=min;
    nums[length+1]=Q1;
    nums[length+2]=median;
    nums[length+3]=Q3;
    nums[length+4]=max;
  }
 
return(nums);
}
var x = "Hello M_basic_stats_script+js!";
console.log(x);

let mean_arr=[];
mean_arr = calc_mean(last,myfinal_Array);
nlength=mean_arr.length;
var mean=mean_arr[nlength-3];
precision=mean_arr[nlength-2];
sample_size=mean_arr[nlength-1]
mean_arr.splice(nlength-3,3);

var sample=true;
var variance = calc_variance(last,myfinal_Array,mean,sample);
var stdev=calc_stdev(variance);

console.log("Mean  = " + mean );
console.log("Stdev = " + stdev);
console.log("Variance = " + variance);

// min, max, median, Q1, Q3
let quartiles=[];
quartiles = calc_quartiles(mean_arr);
var qlen=quartiles.length;
var min=quartiles[qlen-5];
var Q1=quartiles[qlen-4];
var median=quartiles[qlen-3];
var Q3=quartiles[qlen-2];
var max=quartiles[qlen-1];
var Range=max-min;
console.log("min  = " + min);
console.log("Q1  = " + Q1);
console.log("median  = " + median);
console.log("Q3  = " + Q3);
console.log("max  = " + max);
console.log("Range  = " + Range);

if (Math.abs(Range)<1)
   {
    precision_adjusted=precision+1;
   }
else
   {
    precision_adjusted=precision;
   }
fixed=true;

mean_display=AI_round(mean,precision_adjusted,fixed);
stdev_display=AI_round(stdev,precision_adjusted,fixed);
variance_display=AI_round(variance,2*precision_adjusted,fixed);
let quartiles_display=[];

for (let i=0;i<5;i++)
{
  quartiles_display[i]=AI_round(Number(quartiles[qlen-5+i]),precision_adjusted,fixed);
}
Range_display=AI_round(Range,precision_adjusted,fixed);

// determine if data are normal (Anderson-Darling normality test)
quartiles.splice(qlen-5,5);
var alpha=0.05;
var AD;
var p_value;
let AD_values=[];
AD_values=normality_test(quartiles);
AD=AD_values[0];
p_value=AD_values[1];
fixed=true;
precision_AD=5;
document.write('Normality test (Anderson-Darling):<br>');
document.write('AD value=      ' + AI_round(AD,precision_AD,fixed) + '<br>');
document.write('p_value = ' + AI_round(p_value,precision_AD,fixed) + '<br>');

if (p_value < alpha) {
   normality=false;
   document.write("Data are not normal! <br><br>");
   }
else {
  normality=true;
  document.write("Data are normal! <br><br>");
  }

sample_size=last-1;
document.write("Basic Statistics:<br>");
document.write("Sample size = " + sample_size + "<br>");
document.write("Mean     = " + mean_display + "<br>");
document.write("Standard deviation = " + stdev_display + "<br>");
document.write("Variance = " + variance_display + "<br>");
document.write("Min =    " + quartiles_display[0] + "<br>");
document.write("Q1 =     " + quartiles_display[1] + "<br>");
document.write("Median = " + quartiles_display[2] + "<br>");
document.write("Q3 =     " + quartiles_display[3] + "<br>");
document.write("Max =    " + quartiles_display[4] + "<br>");
document.write("Range =  " + Range_display +"<br><br>");

// sample size determination
alpha=0.05;
var delta=2;
var historical_sigma=1.5;
min_sample_size=calc_sample_size(alpha,delta,historical_sigma);
document.write("Minimum sample size =  " + min_sample_size + "<br><br>");

// process capability - long term dasta by default
var long_term=true;
Z_shift=parseFloat(M_Z_shift);
console.log('Z_shift= ' + Z_shift);

LSL_val=parseFloat(LSL);
USL_val=parseFloat(USL);
console.log('LSL= ' + LSL_val);
console.log('USL= ' + USL_val);

let Z=[];
Z=calc_process_capability(mean_arr,mean,stdev,LSL_val,USL_val,normality);
subscript_LT="\u029f\u1d1b";
subscript_ST="\ua731\u1d1b";
subscript_shift="\ua731\u029c\u026a\ua730\u1d1b";

Z_returned=Z[0];
Z_LSL=Z[1];
Z_USL=Z[2];
p_defects_total=Z[3];
p_defects_LSL=Z[4];
p_defects_USL=Z[5];

if (long_term)
{
  Z_long_term=Z[0];
  Z_LSL_long_term=Z[1];
  Z_USL_long_term=Z[2];
  p_defects_LT=Z[3];
  p_defects_LSL_LT=Z[4];
  p_defects_USL_LT=Z[5];  

  Z_short_term=Z_long_term+Z_shift;
  p_defects_ST=1-NORMSDIST(Z_short_term);

  second_Z_to_display=Z_short_term;
  second_p_defects_to_display=p_defects_ST;
  first_subscript=subscript_LT;
  second_subscript=subscript_ST;
  first_precision_for_p=give_precision_of_proba(Z_long_term);
  second_precision_for_p=give_precision_of_proba(Z_short_term);
}
else
{
  Z_short_term=Z[0];
  Z_LSL_short_term=Z[1];
  Z_USL_short_term=Z[2];
  p_defects_ST=Z[3];
  p_defects_LSL_ST=Z[4];
  p_defects_USL_ST=Z[5];

  Z_long_term=Z_short_term-Z_shift;
  p_defects_LT=1-NORMSDIST(Z_long_term);

  second_Z_to_display=Z_long_term;
  second_p_defects_to_display=p_defects_LT;
  first_subscript=subscript_ST;
  second_subscript=subscript_LT;
  first_precision_for_p=give_precision_of_proba(Z_short_term);
  second_precision_for_p=give_precision_of_proba(Z_long_term);
}

precision_for_Z=2;
if (normality)
  {
  document.write("Process Capability (Z-transform calculation):<br>");
  document.write("Z_LSL " + first_subscript + "= " + AI_round(Z_LSL,precision_for_Z,fixed) + "<br>");
  document.write("% of LSL defects " + first_subscript + "= " + AI_round(p_defects_LSL*100,first_precision_for_p,fixed) + "%<br>");
  
  document.write("Z_USL " + first_subscript + "= " + AI_round(Z_USL,precision_for_Z,fixed) + "<br>");
  document.write("% of USL defects " + first_subscript + "= " + AI_round(p_defects_USL*100,first_precision_for_p,fixed) + "%<br>");
  
  document.write("Z" + first_subscript + "= " + AI_round(Z_returned,precision_for_Z,fixed) + "<br>");
  document.write("% of total defects " + first_subscript + "= " + AI_round(p_defects_total*100,first_precision_for_p,fixed) + "%<br><br>");
  }
else
  {
  document.write("Process Capability (Observed defects):<br>");  
  document.write("% of LSL defects " + first_subscript + "= " + AI_round(p_defects_LSL*100,first_precision_for_p,fixed) + "%<br>");
  document.write("Z_LSL " + first_subscript + "= " + AI_round(Z_LSL,precision_for_Z,fixed) + "<br>");
  
  document.write("% of USL defects " + first_subscript + "= " + AI_round(p_defects_USL*100,first_precision_for_p,fixed) + "%<br>");
  document.write("Z_USL " + first_subscript + "= " + AI_round(Z_USL,precision_for_Z,fixed) + "<br>");
  
  
  document.write("% of total defects " + first_subscript + "= " + AI_round(p_defects_total*100,first_precision_for_p,fixed) + "%<br>");
  document.write("Z" + first_subscript + "= " + AI_round(Z_returned,precision_for_Z,fixed) + "<br><br>");
  }
document.write("Z" + subscript_shift + "= " + M_Z_shift + "<br>");
document.write("Z" + second_subscript + "= " + AI_round(second_Z_to_display,precision_for_Z,fixed) + "<br>");
document.write("% of defects  " + second_subscript + "= " + AI_round(second_p_defects_to_display*100,second_precision_for_p,fixed) + "%<br>");
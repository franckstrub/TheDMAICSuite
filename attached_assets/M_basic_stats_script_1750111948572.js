function calc_mean(last,myfinal_Array)
{
 var sum=0;
 var mean=0;
 console.log("in function calc_basic_stats, nbr of items in myfinal_Array: " + last);
 // console.log("myfinal_Array[0][0] = " + myfinal_Array[0][0]);
 var n=last;
 if(last > 0)
 {
    // calculate mean (even if holes in sample)
    for (let i=0; i < last ; i++)
    { 
    var numbr=parseFloat(myfinal_Array[i][1]);
    if (!isNaN(numbr))
      {
        sum=sum+numbr;
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
      }
 return mean;
}
function calc_variance(last,myfinal_Array,mean,sample)
{
 var variance=0;
 var n=last;
if (last > 1)
  {
      for (let i=0; i < last ; i++)
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
function calc_quartiles(last,myfinal_Array)
{
let quartiles=[];
var n=last;
if (last > 0){
  quartiles[0]=0;
  quartiles[1]=25;
  var median = Math.median(myfinal_Array);
  quartiles[2]=median;
  //quartiles[2]=50;
  quartiles[3]=75;
  quartiles[4]=100;
  }
return(quartiles);
}
var x = "Hello M_basic_stats_script+js!";
console.log(x);

var mean = calc_mean(last,myfinal_Array);
document.write("Mean = " + mean + "<br>");
var sample=true;
var variance = calc_variance(last,myfinal_Array,mean,sample);
var stdev=calc_stdev(variance);
document.write("Standard deviation = " + stdev + "<br>");
document.write("Variance = " + variance + "<br>");

console.log("Mean  = " + mean );
console.log("Stdev = " + stdev);
console.log("Variance = " + variance);
// min, max, median, Q1, Q3
let quartiles=[];
quartiles = calc_quartiles(last,myfinal_Array); 
document.write("Min =    " + quartiles[0] + "<br>");
document.write("Q1 =     " + quartiles[1] + "<br>");
document.write("Median = " + quartiles[2] + "<br>");
document.write("Q3 =     " + quartiles[3] + "<br>");
document.write("Max =    " + quartiles[4] + "<br>");
# ===========================================================================
# Copyright 2013 University of Limerick
#
# This file is part of DREAM.
#
# DREAM is free software: you can redistribute it and/or modify
# it under the terms of the GNU Lesser General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# DREAM is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Lesser General Public License for more details.
#
# You should have received a copy of the GNU Lesser General Public License
# along with DREAM.  If not, see <http://www.gnu.org/licenses/>.
# ===========================================================================

'''
Created on 7 May 2014

@author: Panos
'''

from DistributionFitting import Distributions
from ImportExceldata import Import_Excel
from ReplaceMissingValues import HandleMissingValues
import rpy2.robjects as robjects
from xlwt import Workbook
import json
import xlrd
import random

#Read data from the exported Excel file from RapidMiner and call the Import_Excel object of the KE tool to import this data in the tool
workbook = xlrd.open_workbook(r'Input8PPOS.xlsx','r')     
worksheets = workbook.sheet_names()
worksheet_RapidMiner = worksheets[0] 

A= Import_Excel()
Turnovers=A.Input_data(worksheet_RapidMiner, workbook) #Dictionary with the data from the Excel file

#Create lists with the MAs' names and the Turnovers for the first twelve weeks of 2010 retrieving this data from the dictionary 
PPOS=Turnovers.get('Ppos',[])
SP=Turnovers.get('SP',[])
MA=Turnovers.get('FP Material No PGS+',[])
GlobalDemand=Turnovers.get('Global demand',[])

#Call the Distributions object and fit the data from the list in Normal distribution, so as to have info on Global demand (mean and standard deviation)
D=Distributions()
E=HandleMissingValues()
MA=E.DeleteMissingValue(MA)
t=D.Normal_distrfit(GlobalDemand)
avg=t.get('mean')
stdev=t.get('stdev')

def constrained_sum_sample_pos(n, total):
    """Return a randomly chosen list of n positive integers summing to total.
    Each such list is equally likely to occur."""
 
    dividers = sorted(random.sample(xrange(1, total), n - 1))
    return [a - b for a, b in zip(dividers + [total], [0] + dividers)]

def constrained_sum_sample_nonneg(n, total):
    """Return a randomly chosen list of n nonnegative integers summing to total.
    Each such list is equally likely to occur."""

    return [x - 1 for x in constrained_sum_sample_pos(n, total + n)]     
    
DemandProfile={} #Create a dictionary
MinPackagingSize=10
week=[1,2,3,4,5,6,7,8,9,10] # list that defines the planning horizon, i.e. 10 weeks

for i in week:
    Demand=int(abs(random.normalvariate(avg,stdev))) # Generate a random, non-negative, integer number from the Normal distribution
    AllocatedPercent=0.8-(0.05*i) # Defines a number starts with 0.8 or 80% and reduced with every iteration at 0.05 or 5%
    Remaining_Demand=int((1-AllocatedPercent)*Demand) # Defines the Remaining demand
    a=constrained_sum_sample_nonneg(len(MA),100)
    myInt=100
    a=robjects.FloatVector(a)
    lista = [x/myInt for x in a] # Define a list with the same length as the MA list and elements float numbers with total sum equal to 1  
    b=constrained_sum_sample_nonneg(len(MA),Remaining_Demand) # Define a list with the same length as the MA list and elements with total sum the Remaining demand  
    dicta={}
    for index in range(0,len(MA)):
        MinUnits=round(b[index]*(random.uniform(0,0.2)),0)
        TotalUnits=b[index]
        if TotalUnits<MinPackagingSize:
            TotalUnits=0
        if MinUnits<MinPackagingSize:
            MinUnits=0
        dicta.update({MA[index]:[TotalUnits,MinUnits]}) # it updates a dictionary with key the different MAs and values the remaining demand and (b[index]*lista[index])        
        DemandProfile.update({i:dicta}) #It updates a dictionary with key the number of each iteration (week) and value the dictionary dicta

Table=[]
i=0
for i in range(len(MA)):
    Table.append([PPOS[i],SP[i],MA[i]])
    i+=1
uniquePPOS=[]
for ppos in PPOS:
    if not ppos in uniquePPOS and ppos!='':
        uniquePPOS.append(ppos)


# ###=====================================================================================================###
# 
# book = Workbook()                   
# sheet1 = book.add_sheet('Future Demand Profile', cell_overwrite_ok=True)
# r=0
# for key in DemandProfile.keys():
#     t=1
#     for elem in DemandProfile[key]:
#         sheet1.write(2+t,0,elem)
#         sheet1.write(t+2,key+r,DemandProfile[key].get(elem)[0])
#         sheet1.write(t+2,key+r+1,DemandProfile[key].get(elem)[1])
#         book.save('Output8PPOS.xls')
#         t+=1
#     r+=1
###======================================================================================================###
book=Workbook()
sheet1 = book.add_sheet('New Output', cell_overwrite_ok=True)
aggrTable=[]
for key in DemandProfile.keys():
    for elem in DemandProfile[key]:
        if DemandProfile[key].get(elem)[0]> 0:
            MAkey=elem
            totalUnits=DemandProfile[key].get(elem)[0]
            minUnits=DemandProfile[key].get(elem)[1]
            plannedWeek=key
            aggrTable.append([MAkey,totalUnits,minUnits,plannedWeek])
        else: 
            continue  
t=1
aggrTable.sort(key=lambda x:x[1], reverse=False)
for i in sorted(aggrTable, key= lambda x:int(x[3])):
    sheet1.write(0,0,'Order ID')
    sheet1.write(0,1,'MA ID')
    sheet1.write(0,2,'Total # Units')
    sheet1.write(0,3,'Min # Units')
    sheet1.write(0,4,'Planned Week')
    sheet1.write(t,1,i[0])
    sheet1.write(t,2,i[1])
    sheet1.write(t,3,i[2])
    sheet1.write(t,4,i[3])
    sheet1.write(t,0,t)    
    book.save('NewOutput8PPOS.xls')
    t+=1

# open json file
futureDemandProfileFile=open('futureDemandProfile.json', mode='w')
futureDemandProfile={}

t=1
for i in sorted(aggrTable, key= lambda x:int(x[3])):
    dicta={'MAID':i[0],'TotalUnits':i[1],'MinUnits':i[2],'PlannedWeek':i[3]}
    futureDemandProfile[t]=dicta
    futureDemandProfileString=json.dumps(futureDemandProfile, indent=5)
    t+=1

#write json file
futureDemandProfileFile.write(futureDemandProfileString)
        
###==================================================================================================### 
book=Workbook()
sheet1 = book.add_sheet('PPOS Profile', cell_overwrite_ok=True)

PPOSToBeDisaggregated='PPOS4'
PPOSQuantity=1000
PlannedWeek=2

dictPPOS={}
dictPPOSMA={}

for ind in uniquePPOS:
    indices=[i for i,j in enumerate(PPOS) if j==ind]
    mas=[ma for ma in MA if (MA.index(ma) in indices)]
    dictPPOSMA.update({ind: mas})

t=1
for key in dictPPOSMA.keys():
    for elem in dictPPOSMA[key]:    
        if key==PPOSToBeDisaggregated:
            c=constrained_sum_sample_nonneg(len(dictPPOSMA[key]),PPOSQuantity)
            d=constrained_sum_sample_nonneg(len(dictPPOSMA[key]),100)
            myInt=100
            d=robjects.FloatVector(d)
            listd = [x/myInt for x in d]
            for i in range(0,len(dictPPOSMA[key])):
                MinUnits=round(c[i]*(random.uniform(0,0.2)),0)
                TotalUnits=c[i]
                if TotalUnits<MinPackagingSize:
                    TotalUnits=0
                if MinUnits<MinPackagingSize:
                    MinUnits=0
                dictPPOS.update({dictPPOSMA[key][i]:[TotalUnits,MinUnits]})
                             
t=1
for i in range(0,len(dictPPOS)):
    sheet1.write(0,0,'Order ID')
    sheet1.write(0,1,'MA ID')
    sheet1.write(0,2,'Total # Units')
    sheet1.write(0,3,'Min # Units')
    sheet1.write(0,4,'Planned Week')
    sheet1.write(t,0,t)
    sheet1.write(t,1,dictPPOSMA[PPOSToBeDisaggregated][i])
    sheet1.write(t,2,dictPPOS[dictPPOSMA[PPOSToBeDisaggregated][i]][0])
    sheet1.write(t,3,dictPPOS[dictPPOSMA[PPOSToBeDisaggregated][i]][1])
    sheet1.write(t,4,PlannedWeek)
    book.save('PPOSOutput8PPOS.xls')
    t+=1  
        

# open json file
PPOSProfileFile=open('PPOSProfile.json', mode='w')
PPOSProfile={}
t=1
for i in range(0,len(dictPPOS)):
    dictb={'MAID':dictPPOSMA[PPOSToBeDisaggregated][i],'TotalUnits':dictPPOS[dictPPOSMA[PPOSToBeDisaggregated][i]][0],'MinUnits':dictPPOS[dictPPOSMA[PPOSToBeDisaggregated][i]][1],'PlannedWeek':PlannedWeek}
    PPOSProfile[t]=dictb
    PPOSProfileString=json.dumps(PPOSProfile, indent=5)
    t+=1

#write json file
PPOSProfileFile.write(PPOSProfileString)
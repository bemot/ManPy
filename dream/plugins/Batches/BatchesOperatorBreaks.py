from dream.plugins import plugin
from dream.plugins.TimeSupport import TimeSupportMixin
import datetime

class BatchesOperatorBreaks(plugin.InputPreparationPlugin, TimeSupportMixin):
  """ Output the schedule of operators in an Excel file to be downloaded
  """

  def preprocess(self, data):
    strptime = datetime.datetime.strptime
    # read the current date and define dateFormat from it
    try:
        now = strptime(data['general']['currentDate'], '%Y/%m/%d %H:%M')
        data['general']['dateFormat']='%Y/%m/%d %H:%M'
    except ValueError:
        now = strptime(data['general']['currentDate'], '%Y/%m/%d')
        data['general']['dateFormat']='%Y/%m/%d'
    self.initializeTimeSupport(data)
    
    breakData=data['input']['operator_shift_spreadsheet'] 
    for row in breakData:
        if row[0] in ['Date', '', None]:
            continue
        date=strptime(row[0], '%Y/%m/%d')
        operators=row[1].split(',')
        i=4
        while row[i] not in ['', None]:
            breakStart=self.convertToSimulationTime(strptime("%s %s" % (row[0], row[i]), '%Y/%m/%d %H:%M'))
            i+=1
            breakEnd=self.convertToSimulationTime(strptime("%s %s" % (row[0], row[i]), '%Y/%m/%d %H:%M'))
            i+=1
            # if the end of break shift already finished we do not need to consider in simulation
            if breakStart<0 and breakEnd<=0:
                continue
            # if the start of the shift is before now, set the start to 0
            if breakStart<0:
                breakStart=0
            # sometimes the date may change (e.g. break from 23:00 to 01:00). 
            # these would be declared in the date of the start so add a date (self.timeUnitPerDay) to the end
            if breakEnd<breakEnd:
                breakEnd+=self.timeUnitPerDay  
            # add the break to the operator
            for operator in operators:
                PB=data['graph']['node'][operator]
                interruptions=PB.get('interruptions',{})
                scheduledBreaks=interruptions.get('scheduledBreak',{})
                if scheduledBreaks:
                    scheduledBreaks['breakPattern'].append([breakStart,breakEnd])
                else:
                    PB['interruptions']['scheduledBreak']={
                              "endUnfinished": 0, 
                              "breakPattern": [
                                   [
                                        breakStart, 
                                        breakEnd
                                   ]
                              ]
                        }  
#     import json
#     outputJSONString=json.dumps(data['graph']['node'], indent=5)
#     outputJSONFile=open('h.json', mode='w')
#     outputJSONFile.write(outputJSONString)     
    return data
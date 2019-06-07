  /* global global, zway */

/*** DoorEventLogging ZAutomation module ****************************************

Version: 0.0.1
(c) John Dowling, 2019

-------------------------------------------------------------------------------
Author: John Dowling
Description:
    This module does some stuff

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DoorEventLogging (id, controller) {
    // Call superconstructor first (AutomationModule)
    DoorEventLogging.super_.call(this, id, controller);
}

inherits(DoorEventLogging, AutomationModule);

//Static declations
_module = DoorEventLogging;
DoorEventLogging.binderMethods;
// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

DoorEventLogging.prototype.init = function (config) {
    DoorEventLogging.super_.prototype.init.call(this, config);

    var self = this;
    this.binderMethods = [];//Hold methods used to bind
    console.log("DoorEventLogging: init");

    //The boot sequence of ZWay is not well defined.
    //This method is used to detect device creation on boot and niffle any device on the list
    this.deviceCreated = function (vDev) {
	self.doorlogDevice(vDev);
    };
    this.deviceDeleted = function (vDev) {
        self.unDoorlog([vDev.id]);
    };
    //Register for events
    this.controller.devices.on('created', this.deviceCreated);
    this.controller.devices.on('removed', this.deviceDeleted);
    

    //Doorlog all listed devices on each start, this will handle restarts after boot
    this.config.sourceDevices.forEach(function(devId) {
    	self.doorlogDevice(this.controller.devices.get(devId));
    });
	console.log("DoorEventLogging","vdev create");
	var defaults = {
		metrics: {
			title: self.getInstanceTitle()
		}
	};
 
	var overlay = {
			deviceType: "DoorEventDevice",
			metrics: {
				icon: "lock",
				user: -1,
				event_string: ""
			}	  
	};
	this.vDev = this.controller.devices.create({
		deviceId: "DoorEventDevice_" + this.id,
		defaults: defaults,
		overlay: overlay,
		moduleId: this.id
	});
};

DoorEventLogging.prototype.stop = function () {

    console.log("DoorEventLogging: stop() called");
    //Undoorlog any doorlogged devices
    if(this.config.sourceDevices.length) {
	this.unDoorlog(this.config.sourceDevices);
	this.binderMethods = [];
    }
    //Unregister for device creation
    this.controller.devices.off('created',this.deviceCreated);
    this.controller.devices.off('removed',this.deviceDeleted);
	//remove vdev
	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}
    DoorEventLogging.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

//Do the actual doorlog on the physical device
DoorEventLogging.prototype.doorlog = function(virtualDevice) {

    var index = this.getDeviceIndex(virtualDevice.id);
    if ( global.ZWave && !isNaN(index) ) {
	      var binderMethod;
        var deviceType = virtualDevice.get('deviceType');
        if(deviceType === 'doorlock'){
            binderMethod = function(type) {
                   console.log("DoorEventLogging","loogie doorlock alarm event");
		   var alarmData = zway.devices[index].Alarm.data;
		   var alarmUser = -1;
		   switch(alarmData.V1event.alarmType.value){
			   case 19: //keypad lock open operation
				   alarmUser = alarmData.V1event.level.value;
			   case 21: //manual lock operation (keypad swipe too)
			   case 22: //manual lock open
			   case 24: //rf lock operation
			   case 25: //rf lock open operation
				   console.log("DoorEventLogging", "hot damn got me an event!");
				   console.log("DoorEventLogging", alarmData[6].eventString.value);
				   this.vdev.set("metrics:user", alarmUser);
				   this.vdev.set("metrics:event_string", alarmData[6].eventString.value);
				   break;
			   default:
				   //nothing
				   console.log("DoorEventLogging","dang, unknown alarm type: " + alarmType);
				   break;
	           }
                   //zway.devices[index].DoorLock.Get(); //This call will poll and update the zway UI. Useful since most alarms are lock/unlock events
                };
            zway.devices[index].Alarm.data.V1event.bind(binderMethod);
        }
	   this.binderMethods.push( [index,binderMethod] );//Add method to array for later unbind
    }
};

DoorEventLogging.prototype.unDoorlog = function(UDList) {
    var self = this;
    if(UDList.length)
    {
	    console.log("DoorEventLogging: unDoorlogging existing devices");
	    UDList.forEach(function(vDevId) {
	      var index = self.getDeviceIndex(vDevId);
	      var unBinder = null;
	      for(n=0; n<self.binderMethods.length; n++) {
		      if(self.binderMethods[n][0] === index) {
		         unBinder = self.binderMethods[n][1];
		         break;
		      }
	      }
	      console.log("DoorEventLogging: unDoorlogging ", vDevId);
	      if (global.ZWave && !isNaN(index) && unBinder !== null ) {
           if (this.controller.devices.get(vDevId).get('deviceType') === 'doorlock') {
              console.log("DoorEventLogging: unDoorlogging doorlock");
              zway.devices[index].Alarm.data.V1event.unbind(unBinder);
           }
	      }
	    });
    }
};

//Retrieve the index of the physical device. null if not found
DoorEventLogging.prototype.getDeviceIndex = function(vdevid) {
	var str = vdevid;
	console.log("DoorEventLogging: getdeviceindex: ", str);

	var res = str.split("_");
	if(res.length != 3 && str[0] != "ZWayVDev")
	    return null;
	return res[2].split("-")[0];
};

//Doorlog a device if it is in the source list.
//vdevid is the virtual device and index is the physical device location
DoorEventLogging.prototype.doorlogDevice = function(vdev) {

    if(!vdev) return;
    var sdev;
    //Should this device be doorlogged? Look for it in the source list
    this.config.sourceDevices.forEach(function(adev) {
	if(adev === vdev.id) {
	    sdev = adev;
	    return;
	}
    });
    if(sdev) {//We have a match
	//Doorlog this device
	console.log("DoorEventLogging: Doorlogging device ",vdev.id);
	this.doorlog(vdev);
    }
};

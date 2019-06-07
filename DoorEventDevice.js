// Important: constructor SHOULD always be successful
DoorEventDevice = function (id, controller) {
    // Always call superconstructor first
    DoorEventDevice.super_.call(this, id, controller);

    // Define VDevs properties
    this.deviceType = "virtual";
    //this.deviceSubType = "batteryPolling";
    //this.widgetClass = "BatteryStatusWidget";

    // Setup some additional metrics (many of them is setted up in a base class)
    this.setMetricValue("EventUser", -1);
    this.setMetricValue("EventString", "");
}

inherits(DoorEventDevice, VirtualDevice);

DoorEventDevice.prototype.performCommand = function (command) {
    var handled = true;
    return DoorEventDevice.super_.prototype.performCommand.call(this, command);
}

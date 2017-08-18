# Process.js - CRM 2013-D365 Call Actions and Workflows from JavaScript
[![download](https://user-images.githubusercontent.com/14048382/27844360-c7ea9670-6174-11e7-8658-80d356c1ba8f.png)](https://github.com/PaulNieuwelaar/processjs/releases/download/v2.0/ProcessJS_2_0_2_0.zip) (v2.0) [<img align="right" src="https://user-images.githubusercontent.com/14048382/29433676-4eb13ea6-83f4-11e7-8c07-eca514b1b197.png"/>](https://github.com/PaulNieuwelaar/processjs/wiki/Documentation)

## Overview
This simple JavaScript library allows you to easily call workflows, dialogs, and actions in CRM from forms, views, web resources, or anywhere that supports JavaScript. This solution works in CRM 2013, CRM 2016, and everything in between, including CRM Online and CRM 2016 Update 1.0. (Also in my opinion easier to use and better than Web Api is currently).

In the past if you've needed to call a workflow or action from JavaScript, you need to build a massive XML SOAP request making sure to pass in the correct attributes and conditions to get the request working.

This is tedious and messy, especially when there are many places you need to do this in a solution. It's also not good if something breaks in the future and you need to go back and fix up all instances of where the code is being used.

For these reasons, I've created this library to simplify calling processes, and to make the code manageable going forward. But most of all, it's so I don't have to keep finding the correct way to build the SOAP requests!

For completeness, I've also included a function for calling dialogs, which simply pops open the specified dialog.

Make sure to add a reference to the process.js code library on your form or ribbon.

Check out the [Documentation](https://github.com/PaulNieuwelaar/alertjs/wiki/Documentation) for more detailed usage information.

## Call Action
Calls the specified action and returns the response from the action asynchronously. Useful when needing to run C# code from web resources or command bar buttons when only JavaScript is available. 

You can also kind of call the CRM "actions" such as create and update by specifying the action name as "Create" or "Update", and the pass in the correct input parameters, i.e. an Entity object called "Target". While this does appear to work, I'm not supporting such calls, so please stick to custom actions if you want it to work in future :)

Parameters: Action Unique Name, Input Parameters (array), Success Callback (function), Error Callback (function), CRM Base URL (not required on forms/views)

Each Input Parameter object should contain key, value, and type. Types are defined by Process.Type enum. EntityReference values should be an object containing id and entityType. 

To assist with creating EntityReference and Entity objects, use the build in Process.EntityReference and Process.Entity types, e.g.: var entity = new Process.Entity("account", "{guid}"); entity.attributes["fieldname"] = "Some value";

The Success Callback function should accept 1 argument which is an object containing the output parameters. E.g. to access the "OutputParam1" value, use: var value = params["OutputParam1"]. If the output param type is Entity or EntityReference, the "value" will be of those types, allowing you to access properties like: value.id. EntityCollections will simply be an array of Entity objects. 

Access fields from an entity object using: value.attributes["fieldname"].value (check for null first), or use the extension method: value.get("fieldname") to handle the null check itself. Access formatted values for certain field types using: value.formattedValues["fieldname"].

Check out [Process.js Extensions](https://github.com/PaulNieuwelaar/processjsext) for pre-made sample Actions which can be used with Process.js to get you started.

Usage:
```javascript
Process.callAction("mag_Retrieve",
    [{
        key: "Target",
        type: Process.Type.EntityReference,
        value: new Process.EntityReference("account", Xrm.Page.data.entity.getId())
    },
    {
        key: "ColumnSet",
        type: Process.Type.String,
        value: "name, statuscode"
    }],
    function (params) {
        // Success
        alert("Name = " + params["Entity"].get("name") + "\n" +
              "Status = " + params["Entity"].formattedValues["statuscode"]);
    },
    function (e, t) {
        // Error
        alert(e);

        // Write the trace log to the dev console
        if (window.console && console.error) {
            console.error(e + "\n" + t);
        }
    });
```

## Call Workflow
Runs the specified workflow for a particular record asynchronously. Optionally, you can add callback functions which will fire when the workflow has been executed successfully or if it fails.

Parameters: Workflow ID/Guid, Record ID/Guid, Success Callback (function), Error Callback (function), CRM Base URL (not required on forms/views)

Usage:
```javascript
Process.callWorkflow("4AB26754-3F2F-4B1D-9EC7-F8932331567A", 
    Xrm.Page.data.entity.getId(),
    function () {
        alert("Workflow executed successfully");
    },
    function () {
        alert("Error executing workflow");
    });
```

## Call Dialog
**Note:** This function has been deprecated. It will remain in the solution, however no future enhancements or fixes will be done. Please check out [Alert.js](https://github.com/PaulNieuwelaar/alertjs/wiki/Documentation#alertshowdialogprocess) for a better way of showing dialogs.

Opens the specified dialog for a particular record in a CRM light-box, or Modal Dialog if run from Outlook. Once the dialog is closed, a custom callback function can be executed, e.g. to refresh the form with new data set by the dialog.

Parameters: Dialog ID/Guid, Entity Name, Record ID/Guid, Callback function, CRM Base URL (not required on forms/views)

Usage:
```javascript
Process.callDialog("C50B3473-F346-429F-8AC7-17CCB1CA45BC", "contact", 
    Xrm.Page.data.entity.getId(),         
    function () { 
        Xrm.Page.data.refresh(); 
    });
```

Created by [Paul Nieuwelaar](http://paulnieuwelaar.wordpress.com) - [@paulnz1](https://twitter.com/paulnz1)  
Sponsored by [Magnetism Solutions - Dynamics CRM Specialists](http://www.magnetismsolutions.com)

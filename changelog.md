## v2.0 (stable)
This release includes major enhancements to the callAction function, including completely changing the outputParams format to be accessible directly from the object like outputParams["Param1"] to get the value, rather than having to loop through the key/values.

If you're upgrading from v1.0 or v1.1:
MAKE SURE TO UPDATE YOUR OUTPUT PARAMS TO SUPPORT THE NEW FORMAT!

outputParams[0].key and outputParams[0].value are no longer supported. Instead use outputParams["YourParamName"] to get the value directly.

New features include:
* Added ability to use Entity and EntityCollection's in both the input and output parameters.
* New types added to help build and use the Entity objects, including a new .get() extension on the entity objects to make getting field values from the retrieved entities a lot easier.
* Added support for a few uncommon data types, including Float, Decimal, and Guid.
* As mentioned above, output params are now accessed using params["YourParamName"] directly, instead of having to loop through the parameters.
* Also added the plugin trace log as the second parameter in the errorCallback handler.
* Full documentation for callAction, callWorkflow, and callDialog, since this one-pager is getting too big (see the Documentation tab).
* All new sample Actions for the common SDK Messages and more to help you get started over at Process.js Extensions

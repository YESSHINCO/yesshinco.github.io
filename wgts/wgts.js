///////////////////////////////////////////////////////////////////////////////
// ux.wgt.inputText
/*
	편집에서 입력된 Text는 Placeholder로 사용됨

	[State]
		normal
		readonly
	[Scripting]
		run(): focus
			Input이 Focus를 받음. Value는 무과함
			wgt.setData(i, 'focus', true);

		setData/getData()
			selection
				Text의 selection 영역을 가져오거나 지정함
					{start:Number, end:Number}
				의 형태이며,
				값은 Input.selectionStart/selectionEnd와 동일한 기능의 값임
			save: Boolean
				Local/Temp Storage에 값을 저장할지 여부
				저장된 값을 Clear하려면
				false를 Set함
				%%INFO Local Storage에 저장하므로 Cache 지우기 전까지 유효하며. Aspen Reader App은 실행 중까지만 유효할 수 있다.
					
	[Event]
		inputChange
		inputFocus
		inputBlur

*/
var xa = {}

xa.styleMap = {
	title:true
	,visibility:true
	,strokeStyle:true, lineWidth:true, lineDash:true
	,fillStyle:true
	,font:true, fontSize:true, fontStyle:true, fontItalic:true, fontBold:true, textMultiLine: true, fontUnderlined:true
	,text:true,	textAlign:true, textWordWrap:true, ltrSp:true, lnSp:true
	,fontStrokeStyle:true, fontStrokeWidth:true
	,alpha:true
	,angle:true
	,csr:true
}
xa.APX_NO_POINTER_EV = true;
xa.apxInputSave = true;

xa.editor = {};
xa.editor.states = {normal:'Normal', readonly:'Readonly'};
xa.editor.properties = {
	ty:{title:'Type', input:[{title:'Text',value:''},{title:'Number',value:'number'}]}
	,mxl:{title:'MaxLength', input:'', type:'number'}
	,sly:{title:'ScrollBarY', input:[{title:'Auto',value:''},{title:'Always',value:'s'},{title:'Hidden',value:'h'}]}
	,txtI:{title:apn.CExe.GL({ko:'들여쓰기',en:'TextIndent'}), input:'', type:'number'}
	,ime:{title:'IME', input:[{title:'Active',value:'T'},{title:'Inactive',value:'F'},{title:'Inherit',value:''},{title:'Auto',value:'A'}]}
}

/*	%%INFO 모두 위젯 생성할때 WidgetLib에서 넣어서 호출하는 값임
	txtI: Text Indent
	ty
	mx1
	sly
	ime
*/
xa.properties = {};
xa.properties.state = 'normal';
xa.properties.attrs = {
	ime:''
};

xa.scriptInfo = {
	wgtData:{selection:{help:{ko:'{start:0-based Number,end:1-based Number}\n지정된 영역의 텍스트를 선택합니다.',en:'{start:0-based Number,end:1-based Number}\nSelection area of text'}}}
	,wgtRun:{focus:{param:"true", help:{ko:'포커스 상태로 지정합니다. (iOS Safari에서는 Wait에 의한 Focus동작이 보안 제약으로 동작하지 않을 수 있습니다)',en:'Set focus on this input. (Focus-with-wait may not work in iOS Safari by security restriction)'}}}
}

xa.createAsCanvasObject = apn.widgets['apn.wgt.rect'].createAsCanvasObject;
xa.onEdit = apn.widgets['apn.wgt.rect'].onEdit;

xa.exeSetState = function(apx, tag, /*String*/state)
{
	if (state == 'readonly'){
		tag.apxInputTag.readOnly = true;
		tag.apxInputTag.placeholder = '';
	}
	else{
		tag.apxInputTag.readOnly = false;
		tag.apxInputTag.placeholder = apx.wgtGetProperty(tag.apnOID, 'apxText') || '';
	}
}

xa.getIME = function(prj, uAttr)/*String*/
{
	//	IME 사용 여부 - Inherit은 문서에 지정된 값을 Inherit해서 사용한다는 뜻임
	var cssIME = '';

	if (uAttr && uAttr.ime == 'T'){
		cssIME = 'ime-mode:active;'
	}
	else if (uAttr && uAttr.ime == 'F'){
		cssIME = 'ime-mode:inactive;'
	}
	else if (uAttr && uAttr.ime == 'A'){
		//NOOP
	}
	else{ //Inherit
		var exeProp = apn.Project.getLayout(prj).property.CExe;

		if (exeProp && exeProp.lng && exeProp.lng.ime == 'N'){
			//NOOP
		}
		else if (exeProp && exeProp.lng && exeProp.lng.ime == 'A'){
			cssIME = 'ime-mode:inactive;'
		}
		else{
			cssIME = 'ime-mode:active;' // 한글 등을 위한 것으로 IE에서만 동작함
		}
	}

	return cssIME;
}

xa.exeCreateTag = function(viewer, canvas, objData, zx, zy, oId)/*Element*/
{
	var tag;
	var oStyles = objData.create.data.styles;
	var oAttrs = objData.create.data.properties ? objData.create.data.properties.attrs : undefined;

	var cssIME = this.getIME(viewer.project, oAttrs);
	
	//	'input', 'textarea' 2가지 TAG를 검색하므로 ''로 검색함.
	if (viewer.o.standAlone && oId && (tag = apn.CExe.getElementByAttr('', 'data-apx-id', oId))){
		tag.apnCur = {};
		tag.apnCur.apxCreatedFromTag = true;
	}
	else{
		//	%%INFO input은 border:none을 명시적으로 줘야함. 이 값은 공용 함수에서 처리하지 않았으므로 각 INPUT 위젯이 처리해야 함
		var css = cssIME+'position:absolute;box-sizing:border-box;margin:0px;padding:0px;outline:none;background-color:transparent;border:none;';

		if (oStyles && !oStyles.textMultiLine){
			var type = oAttrs&&oAttrs.ty ? oAttrs.ty:'text';

			tag = document.body.$TAG('input', {type:type, autocomplete:'off', autocapitalize:'off', autocorrect:'off', style:css});
		}
		else{
			//	Scroll
			var scrollY = 'auto';

			if (oAttrs && oAttrs.sly == 's'){
				scrollY = 'scroll';
			}
			else if (oAttrs && oAttrs.sly == 'h'){
				scrollY = 'hidden';
			}

			//	Text Indent
			if (oAttrs && oAttrs.txtI !== undefined){
				var txtIdt = bx.$checkNaN(parseFloat(oAttrs.txtI));

				if (txtIdt&&txtIdt>0) css += 'text-indent:'+txtIdt+'em;';
			}
			
			tag = document.body.$TAG('textarea', {autocapitalize:'off', autocorrect:'off', style:css+'overflow-y:'+scrollY+';overflow-x:hidden;resize:none;outline:none;border:none;'});
			tag.$A({'class':'apnCExeScroll'});
		}
		tag.apnCur = {};

		//	Tab Order Disable
		var propCExe = apn.Project.getLayout(viewer.project).property.CExe;

		if (propCExe && propCExe.inputDisableTabOrder == 'Y'){
			tag.setAttribute('tabindex', '-1');
		}
	}
	tag.apxInputTag = tag;

	if (tag.tagName.toLowerCase() == 'input' && bx.HCL.DV.isIOS() && viewer.getFonts){
		var fontList = viewer.getFonts();
		var fontCur = apn.Project.resolveStyle(viewer.project, 'font', oStyles.font);

		for(var i = 0; i < fontList.length; i ++){
			if (fontList[i].face == fontCur && fontList[i].xInIOS){
				tag._fontIOSproblem = fontList[i].xInIOS;
			}
		}
	}

	/*	iOS Input Font 문제 유형은 다음과 같다.
		B = Font의 높이가 크게 인식되는 경우
			DIV로 싸고 Placeholder를 표시하지 않음
		A = 하단이 잘리는 경우
			border-bottom: solid 1px transparent
	*/
	//	IOS의 vertical 정렬 문제로 DIV TAG로 싸줘야 함.
	if (tag._fontIOSproblem == 'B'){
		var input = tag;
		
		delete input.apnCur;

		tag = document.body.$TAG('div', {style:'position:absolute;box-sizing:border-box;overflow:hidden;padding:0;margin:0;'});
		tag.appendChild(input);
		input.style.left = '0px';
		input.style.top = '0px';
		input.style.width = '100%';
		input.style.border = 'none';
		input.style.background = 'transparent';
		input.style.color = 'inherit';
		input.style.letterSpacing = 'inherit';
		input.style.textDecoration = 'inherit';
		input.style.textAlign = 'inherit';
		input.style.font = 'inherit';
		input.style.fontSize = 'inherit';
		input.style.fontWeight = 'inherit';
		input.style.display = 'block';

		tag._fontIOSproblem = input._fontIOSproblem;
		tag.apxInputTag = input;
		tag.apnCur = {};
	}

	if (oAttrs && oAttrs.mxl){
		var max = bx.$checkNaN(parseInt(oAttrs.mxl));

		if (max){
			tag.apxInputTag.setAttribute('maxlength', max);

			//	Number이면 'max'값을 지정해 줘야 크롬의 경우 동작함
			if (oAttrs.ty == 'number'){
				tag.apxInputTag.setAttribute('max', Math.pow(10,max)-1);
			}
		}
	}

	var _this = this;

	/*	%%INFO
			iOS의 경우, Font metric이 높아서 세로 공간이 긴 경우, lineHeight에 따라서 수직 중간 정렬이 동작하지 않는 문제가 있어서, top을 직접 Set함
			그런데, 사전에 value가 존재하는 경우도 있는데, 이것을 감지할 수 없으므로 외부에서 호출하도록 함수를 분리/제공함
			또한, 이 동작은 invisible 상태에서는 동작하지 않으므로, Delayed 처리도 필요함
	*/
	tag.apxInputTag._reconstruct = function()
	{
		if (tag._fontIOSproblem == 'B'){
			if (canvas.wgtIsVisible(oId)){
				//	비어 있으면, 측정용 Text로 미리 위치를 맞춰 놓음
				var value = this.value;

				if (!value) this.value = 'AgHjkLlpqQsTyZ|!'; // 그냥 높이 계산용임.

				this.style.height = 'auto';
				this.style.top = (((tag.clientHeight) - this.offsetHeight)/2)+'px';

				/*	2018/08
					iOS Input의 경우, Placeholder를 표시하는 Logic과 Input을 표시하는 Logic이 별도로 구현된 것으로 생각됨
					따라서, 위치를 보정해도 Placeholder 위치는 다르므로 제거함
					
					대안으로 Placeholder를 tag에 구현하는 방법도 있을 수 있음
				*/
				if (this.offsetHeight > tag.clientHeight && this.getAttribute('placeholder')){
					this.setAttribute('placeholder', '');
				}

				/*	top:50%
					translateY(-50%)
					도 가능한 방안이나 이미 이렇게 구현하였으므로 그대로 사용함
				*/

				if (!value) this.value = value;

				delete this._dlydRct;
			}
			else{ // Delayed
				this._dlydRct = true;
			}
		}
	}

	bx.Event.add(tag.apxInputTag, 'input', function()
	{
		/*	CExe에서 Hit Tag를 찾는 절차에서 발생한 Event이므로 무시해야 함
			Focus변경에 의해서 발생하는 input event도 무시함.
		*/	
		if (bx.HCL.DV.isIE() && bx.HCL.DV.isIE() < 10){
			if (this._valueBK !== undefined && this._valueBK == this.value) return;
			if (this._valueBK === undefined && !this.value) return;
			
			this._valueBK = this.value;
		}

		if (tag.apnOID){
			_this._localSave(canvas, tag);

			canvas.fireEvent('inputChange', undefined, tag.apnOID, /*always*/true);
		}
	}, false);

	bx.Event.add(tag.apxInputTag, 'focus', function()
	{
		//	CExe에서 Hit Tag를 찾는 절차에서 발생한 Event이므로 무시해야 함.
		if (tag.apxIeIgnoreFocusEvent) return;

		this._reconstruct();

		if (tag.apnOID){
			canvas.fireEvent('inputFocus', undefined, tag.apnOID, /*always*/true);
		}
	}, false);

	bx.Event.add(tag.apxInputTag, 'blur', function()
	{
		if (tag.apxIeIgnoreFocusEvent) return;

		if (tag.apnOID){
			canvas.fireEvent('inputBlur', undefined, tag.apnOID, /*always*/true);
		}
	}, false);

	tag.apxInputTag.apxInputTag.$CSS('textShadow', 'inherit');

	if (oStyles && !oStyles.textMultiLine){
		//	크기가 변환할때 lineHeight를 Set하여 수직 정렬을 유지하기 위한 것임
		tag.tagOnPostResize = function(apx, tag)
		{
			tag.style.lineHeight = (parseInt(tag.style.height)-(parseInt(tag.style.borderWidth)||0)*2)+'px';
		}
	}
	else{
		tag.apnOnSetText = function(tag, text, /*Enum|undefined*/Valign, /*Enum|undefined*/align, /*Boolean|undefined*/multiLine,  /*Boolean|undefined*/wordWrap, /*String|undefined*/font, ltrSp, lnSp, /*Number*/fontSize)
		{
			if (Valign) tag._initValign = Valign;
			if (align) tag._initAlign = align;
			if (multiLine !== undefined) tag._initMultiLine = multiLine;
			if (wordWrap !== undefined) tag._initWordWrap = wordWrap;
			if (font !== undefined) tag._initFont = font;
			if (fontSize) tag._initFontSize = fontSize;
			if (ltrSp) tag._initLtrSp = ltrSp;
			if (lnSp) tag._initLnSp = lnSp;

			font = font || tag._initFont;
			lnSp = lnSp || tag._initLnSp;
			ltrSp = ltrSp || tag._initLtrSp;

			// FontSize가 바뀔때 lineHeight 다시 처리해야 함
			if (fontSize){
				var fontHratio = 1.2;//%%DEFAULT

				if (apn.fonts && apn.fonts[font] && apn.fonts[font].height !== undefined) fontHratio = apn.fonts[font].height;

				var lineH = fontSize*fontHratio;

				if (lnSp){
					lineH += lnSp;
				}
				tag.style.lineHeight = lineH+'px';

				if (ltrSp){
					tag.style.letterSpacing = ltrSp+'px';
				}
				else{
					tag.style.letterSpacing = 'normal';
				}
			}
		}
	}
	return tag;
}

xa.exeRenderTag = function(viewer, canvas, tag, objData, zx, zy)/*Element*/
{
	if (tag.apnCur.apxCreatedFromTag && zx == 1 && zy == 1){
		apn.IWidget.exeRenderTagVhtml.call(this, viewer, canvas, tag, objData, zx, zy);
	}
	else{
		var styles = apn.IWidget.exeRenderTagV1.call(this, viewer, canvas, tag, objData, zx, zy);

		/*	SingleLine
			letterSpacing과 lineHeight을 Set함.
			lineHeight는 위젯 크기가 바뀔 때도 tagOnPostResize()에서 다시 Set함
		*/
		if (styles && !styles.textMultiLine){
			if (styles.ltrSp){
				tag.style.letterSpacing = parseFloat(styles.ltrSp)*zx+'px';
			}
			else{
				tag.style.letterSpacing = 'normal';
			}
			tag.style.lineHeight = (parseInt(tag.style.height)-(parseInt(tag.style.borderWidth)||0)*2)+'px';
		}
	}

	if (tag._fontIOSproblem == 'A'){
		tag.apxInputTag.style.borderBottom = 'solid 1px transparent';
	}
	
	return tag;
}

xa.exeOnLoad = function(apx, oId)
{
	var tag = apx.wgtTag(oId);

	//	Load from local data. Be fired at exeOnStart
	this._localLoad(apx, tag);

	var _this = this;

	// run:focus
	function onFocus(changeWgtId, value)
	{
		if (changeWgtId == oId){
			tag.apxInputTag.focus();
		}
	}
	apx.wgtListenProperty(oId, 'focus', onFocus);

	// setData:selection
	function onSelection(changeWgtId, value)
	{
		if (changeWgtId == oId && value){
			tag.apxInputTag.setSelectionRange(value.start, value.end);
		}
	}
	apx.wgtListenProperty(oId, 'selection', onSelection);

	// setData:save
	function onSetSave(changeWgtId, value)
	{
		if (changeWgtId == oId){
			if (value){
				_this._localSave(apx, tag);
			}
			else{
				_this._localClear(apx, tag);
			}
		}
	}
	apx.wgtListenProperty(oId, 'save', onSetSave);

	//	압축 대상 Font가 지정되면 경고 메시지를 출력함
	if (apn.dbUI && apn.dbUI.system && apn.dbUI.system.pubFontCompress){
		var fonts = apn.Project.publishListFontFile(apx.project, undefined, /*_includeDefault*/true);

		for(var i = 0; i < fonts.length; i ++){
			if (fonts[i].compress && fonts[i].face == apx.wgtGetProperty(oId, 'apxFont')){
				apx.log(oId, "Using compressed font '"+fonts[i].title+"' for input widget may cause input problem.");
				break;
			}
		}
	}
}

xa.exeOnVisibilityChange = function(apx, oId, /*Boolean*/isVisible)
{
	var tag = apx.wgtTag(oId);

	if (isVisible && tag.apxInputTag._dlydRct){
		tag.apxInputTag._reconstruct();
	}
}

xa.exeOnStart = function(apx, oId)
{
	var tag = apx.wgtTag(oId);

	tag.apxInputTag._reconstruct();

	apx.fireEvent('inputSet', undefined, oId, /*always*/true);
}

xa.exeInputGet = function(apx, tag)/*Value*/
{
	return tag.apxInputTag.value;
}

xa.exeInputSet = function(apx, tag, value, _noSaveAndFire)/*Value*/
{
	var prv = tag.apxInputTag.value;

	tag.apxInputTag.value = value;

	if (prv != value){
		if (bx.HCL.DV.isIE() && bx.HCL.DV.isIE() < 10){
			tag.apxInputTag._valueBK = value;
		}

		if (!_noSaveAndFire){
			this._localSave(apx, tag);
			apx.fireEvent('inputSet', undefined, tag.apnOID, /*always*/true);
		}
		tag.apxInputTag._reconstruct();
	}
	
	return value;
}

/*	'selection'의 경우, 미리 값을 저장하면 시차가 발생하는 브라우저가 있어서
	항상 Live값을 읽도록 이 함수를 구현함
*/
xa.exePropGet = function(apx, oId, key, /*Boolean|undefined*/check)
{
	if (check){
		if (key == 'selection') return true;
	}
	else{
		if (key == 'selection'){
			var tag;

			if ((tag = apx.wgtTag(oId)).apxInputTag){
				return {start:tag.apxInputTag.selectionStart, end:tag.apxInputTag.selectionEnd};
			}
			else{
				return {start:0, end:0};
			}
		}
	}
}

xa._localSave = function(apx, tag)
{
	if (apx.wgtGetProperty(tag.apnOID, 'save')){
		if (apx.project && apx.project.property.id){
			var key = '$APX$INP_'+apx.project.property.id+':'+tag.apnOID;

			apx.utlLocalSave(key, this.exeInputGet(apx, tag));
		}
	}
}

xa._localLoad = function(apx, tag)/*Boolean*/
{
	if (apx.project && apx.project.property.id){
		var key = '$APX$INP_'+apx.project.property.id+':'+tag.apnOID;
		var value;

		if ((value = apx.utlLocalLoad(key)) !== null){
			this.exeInputSet(apx, tag, value, /*noSaveAndNoti*/true);
			return true;
		}
	}
	return false;
}

xa._localClear = function(apx, tag)
{
	if (apx.project && apx.project.property.id){
		var key = '$APX$INP_'+apx.project.property.id+':'+tag.apnOID;

		if (apn.clearTempFile) apn.clearTempFile(key);
	}
}

xa.edtOnBuildEvent = function(prj, oId, pageID, ret)
{
	ret.inputChange = {value:'inputChange', title:apn.P.eventTitle.inputChange};
	ret.inputSet = {value:'inputSet', title:apn.P.eventTitle.inputSet};
	ret.inputFocus = {value:'inputFocus', title:apn.P.eventTitle.inputFocus};
	ret.inputBlur = {value:'inputBlur', title:apn.P.eventTitle.inputBlur};
}

xa.pubOnGetHTML = function(prj, pId, oId, opts)/*String*/
{
	var oAttrs = prj.pages[pId].objects[oId].create.data.properties ? prj.pages[pId].objects[oId].create.data.properties.attrs : undefined;

	var ret = apn.IWidget.htmlRender(this, prj, pId, oId);
	var html = '', attr = '', cls = '';
	var tagName;

	if (!ret.style.textMultiLine){
		tagName = 'input';
		ret.css += 'outline:none;margin:0px;padding:0px;';
		attr += ' type="'+(oAttrs&&oAttrs.ty ? oAttrs.ty:'text')+'"';
		attr += ' autocomplete="off"'; // autocapitalize="off" autocorrect="off"'; 비표준이라 XHTML에는 추가하지 않음
	}
	else{
		var scrollY = 'auto';

		if (oAttrs && oAttrs.sly == 's'){
			scrollY = 'scroll';
		}
		else if (oAttrs && oAttrs.sly == 'h'){
			scrollY = 'hidden';
		}

		tagName = 'textarea';
		ret.css += 'overflow-y:'+scrollY+';overflow-x:hidden;resize:none;outline:none;margin:0px;padding:0px;';
		cls += ' apnCExeScroll';
		//attr += ' autocapitalize="off" autocorrect="off"'; 비표준이라 XHTML에는 추가하지 않음

		//	Text Indent
		if (oAttrs && oAttrs.txtI !== undefined){
			var txtIdt = bx.$checkNaN(parseFloat(oAttrs.txtI));

			if (txtIdt&&txtIdt>0) ret.css += 'text-indent:'+txtIdt+'em;';
		}
	}

	//	Text 관련 Style
	ret.css += apn.IWidget.htmlRenderText(this, prj, pId, oId, ret);

	//	htmlRender()가 'transparent'를 지정하지 않으므로 INPUT에서는 지정함. 지정해야 표시가 됨.
	ret.css += 'background-color:'+(ret.style.fillStyle||'transparent')+';';

	//	border:none을 명시적으로 줘야함.
	if (!(ret.style.lineWidth && ret.style.strokeStyle)){
		ret.css += 'border:none;';
	}

	attr += ' placeholder="'+(ret.style.text||'')+'"';

	if (!(opts&&opts.noId)){
		attr += ' data-apx-id="'+oId+'"';
	}

	//	IME 사용 여부
	ret.css += this.getIME(prj, oAttrs);

	//	MatLength
	if (oAttrs && oAttrs.mxl){
		var max = bx.$checkNaN(parseInt(oAttrs.mxl));

		if (max){
			attr += ' maxlength="'+max+'"';

			//	Number이면 'max'값을 지정해 줘야 크롬의 경우 동작함
			if (oAttrs.ty == 'number'){
				attr += ' max="'+(Math.pow(10,max)-1)+'"';
			}
		}
	}

	//	실행기에서 Attr 추가. attr0, 즉 firstChild 부분만 처리하면 됨..
	var clsExe = apn.Project.getExeModule(prj);
	var moreDOM;

	if (clsExe.IStub_pubProcWgtAttr && (moreDOM = clsExe.IStub_pubProcWgtAttr(prj, pId, oId))){
		if (moreDOM.attr){
			for(var i in moreDOM.attr){
				if (moreDOM.attr[i] !== undefined){
					attr += ' '+i+'="'+moreDOM.attr[i]+'"';
				}
			}
		}
	}

	html += '<'+tagName;
	html += ' style="'+ret.css+'"';
	html += ' class="apxWgt1'+cls+'"';
	html += attr;
	html += '></'+tagName+'>';

	return html;
}

uxWgtInputText = xa;
///////////////////////////////////////////////////////////////////////////////
// edu.wgt.dragLine
/*
	Handle image는 반드시 필요하고, Base는 없어도 됨. Base를 사용하는 이유는 Base 밑으로 선의 시작점을 감추기 위한 목적임
	Drag동작과 관련된 것은 표준 ITR 편집 방법에 따르면 됨.

	[기능]
		Base나 Line의 시작점은 바뀌지 않음. 즉 ITR로 움직여도 Handle만 움직임.
		%%INFO 이러한 영역외 TAG들이 있으므로 필수 Style이 아니면 지원하지 않음
	Scripting 지원
		setData
			lineColor:lineColor값을 수정함
*/
var xa = apn.inheritWidget(apn.widgets['apn.wgt.image']);

xa.styleMap = {
	title:true
	,visibility:true
	,mediaID:true
	,dragX:true, dragY:true, dragInParent:true, dragContainParent:true
	,alpha:true
	,csr:true
}
xa.styles = {
	dragX:true, dragY:true
}

xa.editor = {}; //%%INFO image의 것이 있으면 무시하고 구성함
xa.editor.iconThumb = 'DB/EDU/imgs/wgts/common/icon_thumb.png';

xa.scriptInfo = {
	wgtData:{
		lineColor:{help:{ko:"#FF0000|rgb(255,0,0)|...\n선의 색상", en:"#FF0000|rgb(255,0,0)|...\nColor of the line", ja:"#FF0000|rgb(255,0,0)|...\n線の色"}, value:'Color'}
		,line:{help:{ko:"[{x:Number,y:Number},{x:Number,y:Number}]\n그려진 선의 좌표", en:"[{x:Number,y:Number},{x:Number,y:Number}]\nCoordinate of the drawn line", ja:"[{x:Number,y:Number},{x:Number,y:Number}]\n描かれた線の座標"}, value:'[{x:Number,y:Number},{x:Number,y:Number}]', type:'go'}
		,base:{help:{ko:"{x:Number,y:Number}\n선의 시작점 위치. Aspen 좌표계", en:"{x:Number,y:Number}\nCoordinate of line's start point in Aspen coordinate system", ja:"{x:Number,y:Number}\n線の始点の位置。Aspen座標系"}, value:'{x:Number,y:Number}'}
	}
}

xa.properties = xa.properties || {};
xa.properties.attrs = xa.properties.attrs || {};
xa.properties.attrs.lineColor = '#0000FF'; // getData()를 위해서 복사됨
xa.properties.attrs.cfg = {
	images:{handle:{mediaID:undefined}, base:{mediaID:undefined}} // handle(m), base(o)
	,lineColor:'#0000FF', lineWidth:5
	,basePos:''
	,dlVer:2 // 2이면 cx, cy값을 line 및 base 위치에 반영함
};

//	Media Seek과 달리 전체 영역이 사용자 입력에 반응하므로 Widget전체에 대해서 Cursor를 지정함
xa.exeOnForceStyle = function(file, styles)
{
	if (!styles.csr || styles.csr == 'apn.auto'){
		styles.csr = 'pointer';
	}
}

xa.exeOnLoad = function(apx, oId)
{
	var tag = apx.wgtTag(oId);
	var cfg = apx.wgtGetProperty(oId, 'cfg');
	var zx = 1/apx.getZoomX(), zy = 1/apx.getZoomY();

	if (!cfg.images.handle.mediaID){
		apx.log(oId, 'Image for "Handle" is not set.');
		return;
	}

	tag.ctx = {};

	tag.ctx.tagLine = tag.parentNode.$TAG('div', {style:'position:absolute;z-index:'+tag.style.zIndex+';display:'+tag.style.display});
	apx.tagPassPointerEvent(tag.ctx.tagLine, true);

	tag.ctx.sX = parseInt(tag.style.left) + parseInt(tag.style.width)/2;
	tag.ctx.sY = parseInt(tag.style.top) + parseInt(tag.style.height)/2;

	// Base 이미지가 있으면 생성함
	if (cfg.images.base.mediaID){
		tag.ctx.uTagBase = tag.parentNode.$TAG('img', {style:'position:absolute;left:'+tag.style.left+';top:'+tag.style.top+';width:'+tag.style.width+';height:'+tag.style.height+';z-index:'+tag.style.zIndex+';display:'+tag.style.display, alt:''});

		if (cfg.dlVer == 2){
			tag.ctx.uTagBase.style.opacity = 0;

			tag.ctx.uTagBase.onload = function()
			{
				this.style.opacity = 1;
				this.style.width = Math.round((this.naturalWidth||this.width)*zx)+'px';
				this.style.height = Math.round((this.naturalHeight||this.height)*zx)+'px';
				this.style.left = (tag.ctx.sX + Math.floor(apx.screen.objects[oId].init.cx*zx) - parseInt(this.style.width)/2)+'px';
				this.style.top = (tag.ctx.sY + Math.floor(apx.screen.objects[oId].init.cy*zy) - parseInt(this.style.height)/2)+'px';
			}
		}

		tag.ctx.uTagBase.src = apx.mediaURL(cfg.images.base.mediaID);
		apx.tagPassPointerEvent(tag.ctx.uTagBase, true);
	}

	// Handle - (Base) - Line 순서로 Z-Index가 되도록 함
	if (tag.ctx.uTagBase){
		apx.tagPutUnder(tag.ctx.uTagBase, tag);

		if (cfg.basePos == 'U'){ // Base가 선 아래
			apx.tagPutOn(tag.ctx.tagLine, tag.ctx.uTagBase);
		}
		else{
			apx.tagPutUnder(tag.ctx.tagLine, tag.ctx.uTagBase);
		}
	}
	else{
		apx.tagPutUnder(tag.ctx.tagLine, tag);
	}

	function lineTo(sX, sY)
	{
		eduWgtDragLine._lineTo(apx, oId, tag.ctx.tagLine, tag.ctx.sX, tag.ctx.sY, sX+parseInt(tag.style.width)/2, sY+parseInt(tag.style.height)/2, cfg.lineWidth, cfg.lineColor, zx, zy);
	}

	tag.apxOnDrag = function(apx, x, y)
	{
		lineTo(x, y);
		return true;
	}

	tag.tagOnPostResize = tag.tagOnPostMove = function(apx, tag)
	{
		lineTo(parseInt(tag.style.left), parseInt(tag.style.top));
	}

	//	lineColor
	function onLineColor(targetWgtId, value)
	{
		if (targetWgtId == oId && value){
			cfg.lineColor = value;
			if (tag.ctx.tagLine) tag.ctx.tagLine.style.borderColor = value;
		}
	}
	apx.wgtListenProperty(oId, 'lineColor', onLineColor);
}

xa.exeOnShow = function(apx, oId, /*Boolean*/show)
{
	var tag = apx.wgtTag(oId);
	if (!tag.ctx) return;

	if (show){
		tag.ctx.tagLine.style.display = 'block';
		if (tag.ctx.uTagBase) tag.ctx.uTagBase.style.display = 'block';
	}
	else{
		tag.ctx.tagLine.style.display = 'none';
		if (tag.ctx.uTagBase) tag.ctx.uTagBase.style.display = 'none';
	}
}

xa._lineTo = function(apx, oId, /*Line*/tag, /*pt1x*/sX1, /*pt1y*/sY1, /*pt2x*/sX2, /*pt2y*/sY2, lineWidth, strokeStyle, zx, zy)
{
	function getAngle(x1, y1, x2, y2)
	{
		return (Math.atan2(x2-x1, y1-y2))%(2*Math.PI) * (180/Math.PI) - 90;
	}

	var sBorder = lineWidth*Math.min(zx, zy); // 뭐 Line이 두꺼우면 좋을 것 없으니 min()으로 처리함.

	//	%%INFO 일부 Android webview에서 height=0 line이 출력되지 않아서, height=1로 지정하고 Top+1처리함
	var offsetY = 0, offsetX = 0;

	if(tag.style.height == '1px'){
		offsetY = 1;
	}

	//	Ver2이면, Origin 즉 cx, cy을 line 위치에 반영함
	var cfg = apx.wgtGetProperty(oId, 'cfg');

	if (cfg.dlVer == 2){
		offsetX += Math.floor(apx.screen.objects[oId].init.cx*zx);
		offsetY += Math.floor(apx.screen.objects[oId].init.cy*zy);
	}

	//
	var length = Math.sqrt(Math.pow(sX2-sX1, 2)+Math.pow(sY2-sY1, 2)) + 0.5; // Canvas가 -0.5 동작을 하므로 대략 맞추기 위해서 +1을 수행함

	tag.style.top = (sY1-Math.floor(sBorder/2) + offsetY)+'px';

	// Round
	tag.style.width = (length+Math.floor(sBorder))+'px';
	tag.style.left = (sX1-Math.floor(sBorder/2) + offsetX)+'px';
	apn.CES.transformSet(tag, 'origin', Math.floor(sBorder/2)+'px 50%');
	tag.$CSS('borderRadius', Math.floor(sBorder)+'px'); // Height 0자리이므로 100%로 줘야 둥글게 됨

	apn.CES.transformSet(tag, 'rotate', getAngle(sX1, sY1, sX2, sY2));
	apn.CES.transformApply(tag);

	var cssLineDash = 'solid';

	tag.style.borderTop = cssLineDash+' '+(sBorder == 0 ? 0 : (Math.floor(sBorder)||1))+'px '+strokeStyle;

	//	Base는 항상 중앙을 기준으로
	if (cfg.dlVer == 2){
		var tagWgt = apx.wgtTag(oId);

		if (tagWgt.ctx.uTagBase){
			tagWgt.ctx.uTagBase.style.left = (sX1+offsetX - parseInt(tagWgt.ctx.uTagBase.style.width)/2)+'px';
			tagWgt.ctx.uTagBase.style.top = (sY1+offsetY - parseInt(tagWgt.ctx.uTagBase.style.height)/2)+'px';
		}
	}
}

xa.exePropGet = function(apx, oId, key, /*Boolean|undefined*/check)
{
	if (key == 'base'){
		if (check){
			 return true;
		}
		else{
			var tag = apx.wgtTag(oId);

			if (tag.ctx){
                var baseX = 0, baseY = 0;

                if (apx.wgtGetParent(oId)){
                    baseX = apx.wgtX(apx.wgtGetParent(oId));
                    baseY = apx.wgtY(apx.wgtGetParent(oId));
                }

				return {x:baseX+apx.toCanvasX(tag.ctx.sX)+apx.screen.objects[oId].init.cx, y:baseY+apx.toCanvasY(tag.ctx.sY)+apx.screen.objects[oId].init.cy}
			}
		}
	}
	else if (key == 'line'){
		if (check){
			 return true;
		}
		else{
			var tag = apx.wgtTag(oId);

			if (tag.ctx){
				var parentOX = bx.HCL.getElementX2(tag.parentNode)-bx.HCL.getElementX2(apx.tag);
				var parentOY = bx.HCL.getElementY2(tag.parentNode)-bx.HCL.getElementY2(apx.tag);

                return [
					{x:Math.round(apx.toCanvasX(tag.ctx.sX+parentOX) + apx.screen.objects[oId].init.cx), y:Math.round(apx.toCanvasY(tag.ctx.sY+parentOY) + apx.screen.objects[oId].init.cy)}
					,{x:Math.round(apx.toCanvasX(parseInt(tag.style.left)+parentOX) + apx.wgtW(oId)/2 + apx.screen.objects[oId].init.cx), y:Math.round(apx.toCanvasY(parseInt(tag.style.top)+parentOY) + apx.wgtH(oId)/2 + apx.screen.objects[oId].init.cy)}
				]
			}
		}
	}
	else if (key == 'lineColor'){
		if (check){
			 return true;
		}
		else{
			var cfg = apx.wgtGetProperty(oId, 'cfg');

			return cfg.lineColor;
		}
	}
}

xa.exePropSet = function(apx, oId, key, value, /*Boolean|undefined*/check)
{
	if (key == 'base'){
		if (check){
			 return true;
		}
		else{
			//	값이 없으면, 현재의 위치로
			if (!value || !(value instanceof Object) || value.x === undefined || value.y === undefined){
				value = {x:apx.wgtX(oId)+apx.wgtW(oId)/2, y:apx.wgtY(oId)+apx.wgtH(oId)/2};
			}
			else{
				value.x -= apx.screen.objects[oId].init.cx;
				value.y -= apx.screen.objects[oId].init.cy;
			}

			var tag = apx.wgtTag(oId);

			if (tag.ctx){
				tag.ctx.sX = apn.widgets.utils.toScreenX(apx, tag, value.x, 1/apx.getZoomX());
				tag.ctx.sY = apn.widgets.utils.toScreenY(apx, tag, value.y, 1/apx.getZoomY());

				//	Draw line
				var cfg = apx.wgtGetProperty(oId, 'cfg');

				this._lineTo(apx, oId, tag.ctx.tagLine, tag.ctx.sX, tag.ctx.sY, parseInt(tag.style.left)+parseInt(tag.style.width)/2, parseInt(tag.style.top)+parseInt(tag.style.height)/2, cfg.lineWidth, cfg.lineColor, 1/apx.getZoomX(), 1/apx.getZoomY());
			}
		}
	}
	else if (key == 'lineColor'){
		if (check){
			 return true;
		}
		else{
			if (value){
				var tag = apx.wgtTag(oId);

				if (tag.ctx){
					var cfg = apx.wgtGetProperty(oId, 'cfg');

					cfg.lineColor = value;
					if (tag.ctx.tagLine) tag.ctx.tagLine.style.borderColor = value;
				}
			}
			else{
				apx.log(oId, "Widget:setData('lineColor') - Invalid parameter.");
			}
		}
	}
}

xa.edtOnPreDraw = function(apd, oId, ctxt, x, y, w, h, IEditable)
{
	var cfg = apd.wgtGetProperty(oId, 'cfg');

	if (cfg && cfg.dlVer == 2 && cfg.images.base.mediaID){
		var obj = apd.getObjectByID(oId);

		if (obj._wgtImgBase === undefined){
			obj._wgtImgBase = null; // Loading 중임을 나타냄

			var imgs = {};

			imgs.base = {url:apd.mediaURL(cfg.images.base.mediaID)};

			function onLoadImgs(cntAll, cntSucc, cntErr)
			{
				if (cntSucc){
					obj._wgtImgBase = imgs.base.image;

					apd.invalidateRect(obj);
					apd.draw();
				}
			}
			new apn.CRscLoader().load(apd.getData(), imgs, onLoadImgs);
		}
		else if (obj._wgtImgBase){
			var ox = obj.shape.w/2 - obj._wgtImgBase.width/2;
			var oy = obj.shape.h/2 - obj._wgtImgBase.height/2;

			if (obj.rotation){ // 여기에 cx, cy 계산값이 있음
				ox += obj.rotation.cx;
				oy += obj.rotation.cy;
			}

			ctxt.drawImage(obj._wgtImgBase, x + ox, y + oy, obj._wgtImgBase.width, obj._wgtImgBase.height);
		}
	}
}

xa.onEdit = undefined

xa.edtOnConfig = function(apd, objID)
{
	var cfg = apd.wgtGetProperty(objID, 'cfg');
	var tagDlg;

	function onOK()
	{
		eduLib.edtInputApplyAll(apd, tagDlg);

		cfg.lineWidth = parseInt(cfg.lineWidth); // To number
		if (cfg.images.handle.mediaID||cfg.images.base.mediaID) apd.wgtSetProperty(objID, 'apxMediaID', cfg.images.handle.mediaID||cfg.images.base.mediaID);
		apd.wgtSetProperty(objID, 'lineColor', cfg.lineColor); // setData/getData() 기능을 위해서 복사함
		apd.wgtSetProperty(objID, 'cfg', cfg);

		apd.getObjectByID(objID)._wgtImgBase = undefined; // Base 이미지가 바뀌었을 수도 있으므로...
	}

	if (tagDlg = apd.dlgDoModal(600, 500, onOK)){
		eduLib.edtInputAdd(apd, tagDlg, {type:'title', title:apn.CExe.GL({ko:'이미지',en:'Image',ja:'画像'})});
		eduLib.edtInputAdd(apd, tagDlg, {type:'image', title:apn.CExe.GL({ko:'핸들',en:'Handle',ja:'ハンドル'})+' (m)', value:cfg.images, key:'handle', join:true});
		eduLib.edtInputAdd(apd, tagDlg, {type:'image', title:apn.CExe.GL({ko:'베이스',en:'Base',ja:'ベース'}), value:cfg.images, key:'base', join:true});
		eduLib.edtInputAdd(apd, tagDlg, {type:'select', title:apn.CExe.GL({ko:'베이스 - 위치',en:'Base - Position',ja:'ベース - 位置'}), options:[{title:apn.CExe.GL({ko:'선 아래',en:'Under the line',ja:'線の下'}),value:'U'},{title:apn.CExe.GL({ko:'[선 위]',en:'[On the line]',ja:'[線の上]'}),value:''}], value:cfg, key:'basePos', join:true});
		eduLib.edtInputAdd(apd, tagDlg, {type:'space'});
		eduLib.edtInputAdd(apd, tagDlg, {type:'title', title:apn.CExe.GL({ko:'선',en:'Line',ja:'線'})});
		eduLib.edtInputAdd(apd, tagDlg, {type:'select', title:apn.CExe.GL({ko:'굵기',en:'Weight',ja:'太さ'}), options:['1','2','3','4','5','7','9','11','13','15','19'], value:cfg, key:'lineWidth', join:true});
		eduLib.edtInputAdd(apd, tagDlg, {type:'color', title:apn.CExe.GL({ko:'색상',en:'Color',ja:'色'}), value:cfg, key:'lineColor', join:true});
	}
}
eduWgtDragLine = xa;

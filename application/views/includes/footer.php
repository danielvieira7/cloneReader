		</div>
	</div>
	<footer ></footer>
<?php	
$crSettings = array(
	'siteName'            => config_item('siteName'),
	'pageSize'            => config_item('pageSize'),
	'pageHome'            => $this->router->default_controller,
	'langId'              => $this->session->userdata('langId'),
	'addTitleSiteName'    => config_item('addTitleSiteName'),
	'defaultCurrencyId'   => config_item('defaultCurrencyId'),
	'defaultCurrencyName' => config_item('defaultCurrencyName'),
	'environment'         => ENVIRONMENT,
	'datetime'            => $this->Commond_Model->getCurrentDateTime(),
);

echo '	
	<script type="text/javascript" >
		var crSettings  = '.json_encode($crSettings).';
		var base_url    = \''. base_url().'\';
	</script>';

$this->carabiner->display('js');		

echo $this->my_js->getHtml();
?>		
</body>
</html>
